// models/chat.model.js

import mongoose from 'mongoose';
// File Attachment Schema
const fileAttachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  size: { type: Number, required: true },
  type: { type: String, required: true },
  url: { type: String, required: true }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['user', 'assistant'] 
  },
  content: { type: String, required: true },
  timestamp: { type: Date, required: true, default: Date.now },
  files: [fileAttachmentSchema]
});

// Conversation Schema
const conversationSchema = new mongoose.Schema({
  conversationId: { 
    type: String, 
    required: true, 
    unique: true, // This creates an index automatically
    default: () => `conv_${Date.now()}`
  },
  updatedAt: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  lastMessage: { type: String },
  messages: [messageSchema],
  metadata: {
    messageCount: { type: Number, default: 0 },
    hasFiles: { type: Boolean, default: false },
    fileTypes: [String]
  }
}, {
  timestamps: true
});

// Only index on updatedAt since conversationId already has a unique index
conversationSchema.index({ updatedAt: -1 });

// Pre-save hook to update metadata
conversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.metadata.messageCount = this.messages.length;
    
    // Update last message content
    if (this.messages.length > 0) {
      const lastMsg = this.messages[this.messages.length - 1];
      this.lastMessage = lastMsg.content.substring(0, 100); // Truncate for preview
    }
    
    // Update file metadata
    const hasFiles = this.messages.some(msg => msg.files && msg.files.length > 0);
    this.metadata.hasFiles = hasFiles;
    
    if (hasFiles) {
      const fileTypes = new Set();
      this.messages.forEach(msg => {
        if (msg.files) {
          msg.files.forEach(file => {
            fileTypes.add(file.type);
          });
        }
      });
      this.metadata.fileTypes = Array.from(fileTypes);
    }
  }
  
  this.updatedAt = new Date();
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

// We don't need a separate Message model since it's embedded

export default Conversation;