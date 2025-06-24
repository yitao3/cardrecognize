import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const maxDuration = 60; // 60 seconds

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
                text: '请从这张名片图片中提取以下信息：国家，姓名、职位、企业名称和手机号码。请注意：1. 仅提取手机号，不要提取座机或传真号。 2. 请根据号码长度和号码内容 判断是否已经包含国家区号，如果不包含则根据名片上的信息和号码内容及长度综合判断最有可能的国家区号是什么，并以 (国家区号)-号码 的格式输出，号码的首位是0的话则去掉0  3. 将提取的所有信息以JSON格式返回，不要包含任何其他说明性文字。例如：{"country": "中国", "name": "张三", "position": "销售经理", "company": "ABC科技有限公司", "phone": "(+86)-13812345678"}',
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