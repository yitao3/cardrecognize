import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';

export async function POST(request: NextRequest) {
  if (!DOUBAO_API_KEY) {
    return NextResponse.json(
      { error: 'Doubao API key is not configured.' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const base64Image = Buffer.from(fileBuffer).toString('base64');
    const imageUrl = `data:${file.type};base64,${base64Image}`;

    const response = await axios.post(
      DOUBAO_API_URL,
      {
        model: 'doubao-seed-1-6-250615',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '请仅提取并返回这张名片图片中的电话号码, 注意仅提取手机号，不要提取fax。 最终输出 格式 (国家区号)-号码。请根据号码长度和号码内容 判断是否已经包含国家区号，如果不包含则根据名片上的信息和号码内容及长度综合判断最有可能的国家区号是什么。不要包含任何其他文字或解释。',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DOUBAO_API_KEY}`,
        },
      }
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error recognizing image:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Doubao API Error:', error.response.data);
      return NextResponse.json(
        { error: 'Doubao API Error', apiError: error.response.data },
        { status: error.response.status }
      );
    }
    return NextResponse.json(
      { error: 'Failed to recognize image.' },
      { status: 500 }
    );
  }
} 