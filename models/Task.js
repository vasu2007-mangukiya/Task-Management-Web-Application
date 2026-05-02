const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    dueDate:     { type: Date },
    status:      { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    priority:    { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    category:    { type: String, enum: ['Work', 'Study', 'Personal', 'Other'], default: 'Other' },
    user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
