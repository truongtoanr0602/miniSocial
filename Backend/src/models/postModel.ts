import mongoose, { Schema, Document } from 'mongoose';

interface IMedia {
    url: string;
    type: 'image' | 'video';
    alt_text?: string;
}

export interface IPost extends Document {
    author_id: mongoose.Types.ObjectId;
    content?: string;
    hashtags: string[];
    media: IMedia[];
    is_repost: boolean;
    original_post_id?: mongoose.Types.ObjectId;
    visibility: 'public' | 'friends' | 'private';
    stats: {
        likes: number;
        comments: number;
        shares: number;
    };
}

const PostSchema: Schema = new Schema({
    author_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    hashtags: [{ type: String }],
    media: [{
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true },
        alt_text: { type: String }
    }],
    is_repost: { type: Boolean, default: false },
    original_post_id: { type: Schema.Types.ObjectId, ref: 'Post' },
    visibility: { type: String, enum: ['public', 'private', 'friends'], default: 'public' },
    stats: {
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 }
    }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'posts'
});

export default mongoose.model<IPost>('Post', PostSchema);