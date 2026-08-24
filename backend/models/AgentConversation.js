const mongoose = require('mongoose');

const agentConversationSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: false },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId:    { type: String, required: true },
  title:        { type: String },


  messages: [{
    role:      { type: String, enum: ['user', 'assistant', 'system'] },
    content:   { type: String, required: true },
    timestamp: { type: Date, default: Date.now },

    // XAI metadata (on assistant messages)
    xai: {
      agentUsed:       String,
      llmUsed:         String,
      confidence:      Number,
      reasoning:       String,
      sources:         [{ docId: String, docName: String, chunk: String, score: Number }],
      toolsUsed:       [String],
      processingTimeMs:Number,
    },
  }],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

agentConversationSchema.index({ organization: 1, user: 1, createdAt: -1 });
agentConversationSchema.index({ sessionId: 1 });

module.exports = mongoose.model('AgentConversation', agentConversationSchema);
