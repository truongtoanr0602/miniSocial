import mongoose, { Schema, Document } from "mongoose";

export interface IReaction extends Document {
  post_id: mongoose.Types.ObjectId;
  user_id: mongoose.Types.ObjectId;
  type: "like";
  created_at: Date;
}

const ReactionSchema: Schema = new Schema(
  {
    post_id: { type: Schema.Types.ObjectId, ref: "Post", required: true },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["like"], default: "like" },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
    collection: "reactions",
  },
);

ReactionSchema.index({ post_id: 1, user_id: 1, type: 1 }, { unique: true });
ReactionSchema.index({ user_id: 1, created_at: -1 });

export default mongoose.model<IReaction>("Reaction", ReactionSchema);
