import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUserProfile extends Document {
    userId: string;
    age?: string;
    studyStandard?: string;
    englishRating?: string;
    learningGoal?: string;
    hobbies?: string;
    isOnboarded: boolean;
}

const UserProfileSchema = new Schema<IUserProfile>({
    userId: { type: String, required: true, unique: true, index: true },
    age: { type: String },
    studyStandard: { type: String },
    englishRating: { type: String },
    learningGoal: { type: String },
    hobbies: { type: String },
    isOnboarded: { type: Boolean, default: false },
});

export const UserProfile: Model<IUserProfile> = mongoose.models.UserProfile || mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);