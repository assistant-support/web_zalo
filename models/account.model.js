import mongoose, { Schema } from 'mongoose';

const accountSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true, select: false },
    role: { type: Schema.Types.ObjectId, ref: 'Role' },
    avatar: { type: String, default: '' },
}, { timestamps: true });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
export default Account;