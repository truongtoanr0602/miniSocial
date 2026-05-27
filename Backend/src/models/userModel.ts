import mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';
export interface IUser extends Document {
    username: string;
    email?: string;
    phone_number: string;
    password_hash: string;
    display_name: string;
    avatar_url: string;
    bio: string;
    location?: string;
    website?: string;
    following: mongoose.Types.ObjectId[];
    followers: mongoose.Types.ObjectId[];
    settings: {
        language: string;
        privacy: 'public' | 'friends' | 'private';
        two_factor_enable: boolean;
    };
    status: 'active' | 'locked' | 'pending';
    role: 'user' | 'admin';
    created_at: Date;
    updated_at: Date;
}

const userSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email:{type: String, unique: true, sparse: true, lowercase: true, trim: true},
    phone_number: { type: String, unique: true, sparse: true, trim: true },
    password_hash: { type: String, required: true },
    display_name: { type: String, required: true, trim: true },
    avatar_url: { type: String, default: 'avatars/default_profile.webp' },
    bio: { type: String, default: '' },
    location: { type: String, default: '', trim: true },
    website: { type: String, default: '', trim: true },
    following: { type: [mongoose.Schema.Types.ObjectId], ref: 'User' },
    followers: { type: [mongoose.Schema.Types.ObjectId], ref: 'User' },
    settings: {
        language: { type: String, default: 'vi' },
        privacy: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
        two_factor_enable: { type: Boolean, default: false }
    },
    status: { type: String, enum: ['active', 'locked', 'pending'], default: 'active' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'users'
});
// KIỂM TRA LOGIC "1 TRONG 2" TRƯỚC KHI LƯU
userSchema.pre('validate', function(this: any) {
  // 'this' đại diện cho user đang chuẩn bị được lưu
  if (!this.email && !this.phone_number) {
    throw new Error('LỖI BẢO MẬT: Phải cung cấp ít nhất email hoặc phone_number');
  }
});
export default mongoose.model<IUser>('User', userSchema);
