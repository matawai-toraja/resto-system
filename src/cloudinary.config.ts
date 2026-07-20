import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'n6pkskmy',
  api_key: '775259719995581',
  api_secret: 'EXqk-w6KcF7tgwvD5ersvfJoOSw' // Ganti dengan secret asli dari dashboard
});

export default cloudinary;