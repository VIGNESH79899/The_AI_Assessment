import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const schema = new mongoose.Schema(
  {
    user: mongoose.Schema.Types.ObjectId,
    topic: String,
    documentName: String,
    aiServiceUrl: String,
    downloadToken: String,
    status: String,
    error: String,
    assessmentType: String,
  },
  { timestamps: true }
);

const GeneratedDocument = mongoose.model('GeneratedDocument', schema);

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected!');
    
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const docs = await GeneratedDocument.find({ createdAt: { $gte: tenMinsAgo } })
      .sort({ createdAt: -1 });
      
    console.log(`Found ${docs.length} recent documents:`);
    for (const doc of docs) {
      console.log('---');
      console.log('ID:', doc._id);
      console.log('Topic:', doc.topic);
      console.log('Document Name:', doc.documentName);
      console.log('Status:', doc.status);
      console.log('Error:', doc.error);
      console.log('AI Service URL:', doc.aiServiceUrl);
      console.log('Created At:', doc.createdAt);
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

run();
