const { Text, Relationship, File } = require('@keystonejs/fields');
const { atTracking, byTracking } = require('@keystonejs/list-plugins');
const { GCSAdapter } = require('../lib/GCSAdapter');
const access = require('../helpers/access');
const gcsDir = 'assets/audios/'

module.exports = {
    fields: {
        file: {
            type: File,
            adapter: new GCSAdapter(gcsDir),
            isRequired: true,
        },
        title: {
            label: '標題',
            type: Text,
            isRequired: true
        },
        /*audio: {
            type: Types.GcsFile,
            initial: true,
            autoCleanup: true,
            datePrefix: 'YYYYMMDDHHmmss',
            bucket: bucket,
            destination: 'assets/audios/',
            publicRead: true,
        },*/
        coverPhoto: {
            label: '封面照片',
            type: Relationship,
            ref: 'Image'
        },
        tags: {
            label: '標籤',
            type: Relationship,
            ref: 'Tag',
            many: true
        },
        meta:{
            label: '中繼資料',
            type: Text
        },
        url:{
            label: '檔案網址',
            type: Text
        },
        duration:{
            label: '音檔長度（秒）',
            type: Number
        }
    },
    plugins: [
        atTracking(),
        byTracking(),
    ],
    access: {
        update: access.userIsAboveAuthorOrOwner,
        create: access.userIsNotContributor,
        delete: access.userIsAboveAuthorOrOwner,
    },
    adminConfig: {
        defaultColumns: 'title, audio, tags, createdAt',
        defaultSort: '-createdAt',
    },
    hooks: {
        resolveInput: ({ operation, existingItem, resolvedData, originalInput }) => {
            if (resolvedData.file) {
                resolvedData.meta = resolvedData.file._meta
                resolvedData.url = resolvedData.file._meta.url
                resolvedData.duration = resolvedData.file._meta.duration
            }
            return resolvedData
        },
    },
    plural: 'Audios',
    labelField: 'title'
}
