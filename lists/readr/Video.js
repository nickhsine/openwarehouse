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
const CustomRelationship = require('../../fields/CustomRelationship')
const ImageRelationship = require('../../fields/ImageRelationship')

const { byTracking } = require('@keystonejs/list-plugins')
const { atTracking } = require('../../helpers/list-plugins')
const { GCSAdapter } = require('../../lib/GCSAdapter')
const {
    admin,
    bot,
    moderator,
    editor,
    contributor,
    allowRoles,
} = require('../../helpers/access/mirror-tv')
const cacheHint = require('../../helpers/cacheHint')

const mediaUrlBase = 'assets/videos/'
const gcsDir = 'assets/videos/'
const fileAdapter = new GCSAdapter(gcsDir)

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
        coverPhoto: {
            label: '封面照片',
            type: ImageRelationship,
            ref: 'Image',
        },
        description: {
            label: '描述',
            type: Text,
            isMultiline: true,
        },
        tags: {
            label: '標籤',
            type: Relationship,
            ref: 'Tag',
            many: true,
        },
        meta: {
            label: '中繼資料',
            type: Text,
            adminConfig: {
                isReadOnly: true,
            },
        },
        url: {
            label: '檔案網址',
            type: Url,
            adminConfig: {
                isReadOnly: true,
            },
        },
        duration: {
            label: '影片長度（秒）',
            type: Integer,
            adminConfig: {
                isReadOnly: true,
            },
        },
    },
    plugins: [
        atTracking({
            hasNowBtn: false,
            isReadOnly: true,
        }),
        byTracking(),
    ],
    access: {
        update: allowRoles(admin, moderator, editor),
        create: allowRoles(admin, moderator, editor),
        delete: allowRoles(admin),
    },
    adminConfig: {
        defaultColumns: 'name, tags, state, publishTime, createdAt',
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
        afterDelete: async ({ existingItem, resolvedData }) => {
            deleteOldVideoFileInGCSIfNeeded(
                existingItem,
                resolvedData,
                fileAdapter
            )
        },
    },
    labelField: 'name',
    cacheHint: cacheHint,
}
