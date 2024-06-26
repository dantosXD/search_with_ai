import { Context } from 'koa';
import { AliyunModels, BaiduModels, DefaultQuery, GoogleModels, LeptonModels, MoonshotModels, OpenAIModels, TencentModels, YiModels } from './constant';
import { searchWithSogou } from './service';
import { aliyun, openai, baidu, yi, tencent, local, moonshot, lepton, google } from './platform';
import { EBackend, IChatInputMessage } from './interface';
import { Rag } from './rag';

export const searchController = async (ctx: Context) => {
  const stream = ctx.request.body.stream ?? true;
  const q = ctx.request.query.q || DefaultQuery;
  const model: string = ctx.request.body.model;
  const engine: EBackend = ctx.request.body.engine;
  const locally: boolean = ctx.request.body.locally ?? false;
  const rag = new Rag({
    stream,
    model,
    backend: engine,
    locally
  });
  if (!stream) {
    const res = await rag.query(q as string);
    ctx.body = res;
    return;
  }
  ctx.res.setHeader('Content-Type', 'text/event-stream');
  ctx.res.setHeader('Cache-Control', 'no-cache');
  ctx.res.setHeader('Connection', 'keep-alive');
  ctx.res.statusCode = 200;
  await rag.query(q as string, (json: string) => {
    const eventData = `data:${JSON.stringify({ data: json })}\n\n`;
    ctx.res.write(eventData, 'utf-8');
  });
  ctx.res.end();
};

export const sogouSearchController = async (ctx: Context) => {
  const q = ctx.request.query.q || DefaultQuery;
  const res = await searchWithSogou(q as string);
  ctx.body = res;
};

export const chatStreamController = async (ctx: Context) => {
  const messages: IChatInputMessage[] = ctx.request.body.messages || [];
  const system: string | undefined = ctx.request.body.system;
  const model: string | undefined = ctx.request.body.model;
  const locally: boolean = ctx.request.body.locally ?? false;
  ctx.res.setHeader('Content-Type', 'text/event-stream');
  ctx.res.setHeader('Cache-Control', 'no-cache');
  ctx.res.setHeader('Connection', 'keep-alive');
  const handler = locally ? local.chatStream.bind(local) : processModel(model);
  ctx.res.statusCode = 200;
  await handler?.(messages, (data) => {
    const eventData = `data: ${JSON.stringify({ text: data || '' })}\n\n`;
    ctx.res.write(eventData);
  }, model, system);
  ctx.res.end();
};

export const modelsController = async (ctx: Context) => {
  const { GOOGLE_KEY, ALIYUN_KEY, OPENAI_KEY, BAIDU_KEY, TENCENT_KEY, YI_KEY, MOONSHOT_KEY, LEPTON_KEY } = process.env;
  const models = {
    aliyun: ALIYUN_KEY ? Object.values(AliyunModels) : [],
    openai: OPENAI_KEY ? Object.values(OpenAIModels) : [],
    baidu: BAIDU_KEY ? Object.values(BaiduModels) : [],
    google: GOOGLE_KEY ? Object.values(GoogleModels) : [],
    tencent: TENCENT_KEY ? Object.values(TencentModels) : [],
    yi: YI_KEY ? Object.values(YiModels) : [],
    moonshot: MOONSHOT_KEY ? Object.values(MoonshotModels) : [],
    lepton: LEPTON_KEY ? Object.values(LeptonModels) : []
  };
  ctx.body = models;
};

// locally llm models
export const localModelsController = async (ctx: Context) => {
  const list = await local.list();
  ctx.body = list;
};


// chat with locally models
export const localChatStreamController = async (ctx: Context) => {
  const messages: IChatInputMessage[] = ctx.request.body.messages || [];
  const model: string | undefined = ctx.request.body.model;
  ctx.res.setHeader('Content-Type', 'text/event-stream');
  ctx.res.setHeader('Cache-Control', 'no-cache');
  ctx.res.setHeader('Connection', 'keep-alive');
  ctx.res.statusCode = 200;
  await local.chatStream(messages, (data) => {
    const eventData = `data: ${JSON.stringify({ text: data || '' })}\n\n`;
    ctx.res.write(eventData);
  }, model);
  ctx.res.end();
};

function processModel(model = OpenAIModels.GPT35TURBO) {
  if (Object.values(AliyunModels).includes(model)) {
    return aliyun.chatStream.bind(aliyun);
  }
  if (Object.values(OpenAIModels).includes(model)) {
    return openai.chatStream.bind(openai);
  }
  if (Object.values(BaiduModels).includes(model)) {
    return baidu.chatStream.bind(baidu);
  }
  if (Object.values(GoogleModels).includes(model)) {
    return google.chatStream.bind(google);
  }
  if (Object.values(TencentModels).includes(model)) {
    return tencent.chatStream.bind(tencent);
  }
  if (Object.values(YiModels).includes(model)) {
    return yi.chatStream.bind(yi);
  }
  if (Object.values(MoonshotModels).includes(model)) {
    return moonshot.chatStream.bind(moonshot);
  }
  if (Object.values(LeptonModels).includes(model)) {
    return lepton.chatStream.bind(lepton);
  }
  return openai.chatStream.bind(openai);
}
