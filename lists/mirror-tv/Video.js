const {
    Text,
    Checkbox,
    Select,
    Relationship,
    File,
    Url,
    Integer,
} = require('@keystonejs/fields')
const NewDateTime = require('../../fields/NewDateTime/index.js')

const { atTracking, byTracking } = require('@keystonejs/list-plugins')
const { GCSAdapter } = require('../../lib/GCSAdapter')
const {
    admin,
    bot,
    moderator,
    editor,
    contributor,
    owner,
    allowRoles,
} = require('../../helpers/access/mirror-tv')
const cacheHint = require('../../helpers/cacheHint')

const mediaUrlBase = 'assets/videos/'
const fileAdapter = new GCSAdapter(mediaUrlBase)

const {
    getNewFilename,
    getFileDetail,
} = require('../../utils/fileDetailHandler')
const {
    deleteOldVideoFileInGCSIfNeeded,
    feedNewVideoData,
    validateWhichKeyShouldCMSChoose,
} = require('../../utils/videoHandler')

module.exports = {
    fields: {
        name: {
            label: '標題',
            type: Text,
            isRequired: true,
        },
        youtubeUrl: {
            label: 'Youtube網址',
            type: Text,
        },
        file: {
            label: '檔案',
            type: File,
            adapter: fileAdapter,
        },
        categories: {
            label: '分類',
            type: Relationship,
            ref: 'Category',
            many: true,
        },
        coverPhoto: {
            label: '封面照片',
            type: Relationship,
            ref: 'Image',
        },
        description: {
            label: '敘述',
            type: Text,
            isMultiline: true,
        },
        tags: {
            label: '標籤',
            type: Relationship,
            ref: 'Tag',
            many: true,
        },
        state: {
            label: '狀態',
            type: Select,
            options: 'draft, published, scheduled',
            defaultValue: 'draft',
        },
        publishTime: {
            label: '發佈時間',
            type: NewDateTime,
        },
        relatedPosts: {
            label: '相關文章',
            type: Relationship,
            ref: 'Post',
            many: true,
        },
        isFeed: {
            label: '供稿',
            type: Checkbox,
            defaultValue: true,
        },
        thumbnail: {
            label: '縮圖網址',
            type: Url,
        },
        meta: {
            label: '中繼資料',
            type: Text,
            access: {
                create: false,
                update: false,
            },
        },
        url: {
            label: '檔案網址',
            type: Url,
            access: {
                create: false,
                update: false,
            },
        },
        duration: {
            label: '影片長度（秒）',
            type: Integer,
            access: {
                create: false,
                update: false,
            },
        },
    },
    plugins: [atTracking(), byTracking()],
    access: {
        update: allowRoles(admin, moderator, editor),
        create: allowRoles(admin, bot, moderator, editor),
        delete: allowRoles(admin),
    },
    hooks: {},
    adminConfig: {
        defaultColumns: 'title, video, tags, state, publishTime, createdAt',
        defaultSort: '-createdAt',
    },
    hooks: {
        validateInput: async ({
            existingItem,
            resolvedData,
            addValidationError,
        }) => {
            const keyToUse = validateWhichKeyShouldCMSChoose(
                existingItem,
                resolvedData,
                addValidationError,
                fileAdapter
            )
            if (!keyToUse) return

            switch (keyToUse) {
                case 'youtubeUrl':
                    // video is from youtube
                    resolvedData.url = resolvedData.youtubeUrl

                    deleteOldVideoFileInGCSIfNeeded(
                        existingItem,
                        resolvedData,
                        fileAdapter
                    )
                    break

                case 'file':
                    // video is from file

                    // if it has prev data,
                    // no matter what, clear youtubeUrl
                    if (existingItem) {
                        resolvedData.youtubeUrl = ''
                    }

                    await feedNewVideoData(resolvedData)

                    deleteOldVideoFileInGCSIfNeeded(
                        existingItem,
                        resolvedData,
                        fileAdapter
                    )
                    break
                case 'no-need-to-update':
                    break

                default:
                    break
            }
        },
        beforeChange: async ({
            existingItem,
            resolvedData,
            addValidationError,
        }) => {
            // validateWhichKeyShouldCMSChoose(
            //     existingItem,
            //     resolvedData,
            //     addValidationError
            // )
        },
        afterDelete: async ({ existingItem }) => {
            deleteOldVideoFileInGCSIfNeeded(existingItem, fileAdapter)
        },
    },
    labelField: 'name',
    cacheHint: cacheHint,
}
