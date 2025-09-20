import mongoose, { Schema } from 'mongoose';

const permissionSchema = new Schema({
    name: { type: String, required: true, unique: true }, 
    description: { type: String }
}, { timestamps: true });

const Permission = mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
export default Permission;