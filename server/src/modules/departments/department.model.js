import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const departmentSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 20,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    parentDepartmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    leadMemberId: {
      type: Schema.Types.ObjectId,
      ref: 'OrganizationMember',
      default: null,
    },
    membersCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true });

departmentSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    organizationId: this.organizationId?.toString ? this.organizationId.toString() : this.organizationId,
    name: this.name,
    code: this.code,
    description: this.description,
    parentDepartmentId: this.parentDepartmentId?.toString ? this.parentDepartmentId.toString() : null,
    leadMemberId: this.leadMemberId?.toString ? this.leadMemberId.toString() : null,
    membersCount: this.membersCount,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Department =
  mongoose.models.Department || model('Department', departmentSchema);
