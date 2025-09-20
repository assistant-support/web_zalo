import mongoose, { Schema } from 'mongoose';

const roleSchema = new Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    permissions: [{ type: Schema.Types.ObjectId, ref: 'Permission' }]
}, { timestamps: true });

const Role = mongoose.models.Role || mongoose.model('Role', roleSchema);
export default Role;