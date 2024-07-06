import { Telegraf } from "telegraf";
import OpenAI from 'openai';
import { message } from "telegraf/filters";
import userModel from './src/models/User.js'
import eventModel from './src/models/Event.js';
import connectDb from './src/config/db.js';


const bot = new Telegraf(process.env.BOT_TOKEN);

const openai = new OpenAI({
  apiKey: process.env['OPENAI_KEY'],
});

try{
  connectDb()
  console.log("database connected sucessfully");
}catch(err){
  console.log(err);
  process.kill(process.pid,'SIGTERM');
}



bot.start(async (ctx) => {
  console.log('ctx', ctx);
  const from = ctx.update.message.from;
  console.log('from',from);
  try{
    await userModel.findOneAndUpdate({tgId: from.id},{
      $setOnInsert:{
        firstName: from.first_name,
        lastName: from.last_name,
        isBot: from.is_bot,
        username: from.username,

      }
    },{upsert: true,new:true}
  );
   //store the user information into db.
  await ctx.reply(`Hey! ${from.first_name}, welcome. I will be writing highly engaging social media posts`);

  } catch(err){
    console.log(err);
    await ctx.reply("facing difficulties!");

  }
 

 
 
});

bot.command('generate',async(ctx)=>{
  const from= ctx.update.message.from;
  const {message_id: waitingMessageId} = await ctx.reply(`Hey! ${from.first_name}, kindly wait for a moment. I am curating posts for you.`)

  const {message_id: loadingStickerId} = await ctx.replyWithSticker(
    'CAACAgIAAxkBAANEZokDGkBcMeJjS09e9PmTnQ3C22EAAgYAA8A2TxPHyqL0sm5wdjUE'
  );




  const startOfDay = new Date();
  startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date();
  endOfDay.setHours(23,59,59,999);
  // get events for the user
  const events = eventModel.find({
    tgId: from.id,
    createdAt: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  });
  if(events.length==0){
    await ctx.deleteMessage(waitingMessageId);
    await ctx.deleteMessage(loadingStickerId);
    await ctx.reply('No events for the day.');
    return;
  }
  console.log('events',events);
  // make openai api call
  try{
  
    const chatCompletion = await openai.chat.completions.create({
      messages:[
        {
          role: 'system',
          content: 'Act as a senior copywriter, you write highly enagaging posts for linkedin, facebook and twitter using provided thoughts/events throught the day.',
        },
        {
          role:'user',
          content:`
          Write like a human, for humans. Craft three engaging social media posts tailored for LinkedIn, Facebook and Twitter audiences. Use simple language. Use given time labels just to understand the order of the event, don't mention the time in the posts. Each post should creatively highlight the following events. Ensure the tone is conversational and impactful. Focus on engaging the respective platform's audiance, encouraging interaction, and driving interest in the events:
          ${events.map((event)=>event.text).join(', ')}
          `,

        },
      ],
      model: process.env.OPENAI_MODEL,
    });

    console.log('completion: ', chatCompletion)

    //store token count
    await userModel.findOneAndUpdate({
      tgId: from.id,
    },{
      $inc: {
        promptTokens:chatCompletion.usage.prompt_tokens,
        completionTokens: chatCompletion.usage.completion_tokens,
      }
    })

    await ctx.deleteMessage(waitingMessageId);
    await ctx.deleteMessage(loadingStickerId);
    await ctx.reply(chatCompletion.choices[0].message.content);

  }catch(err){

    console.log(err)
    await ctx.reply('facing error')

  }
  //store token count
  //send response
 

});

// bot.on(message('sticker'),(ctx)=>{
//   console.log('sticker',ctx.update.message)
// })

bot.on(message('text'),async(ctx)=>{
  const from = ctx.update.message.from;
  const message = ctx.update.message.text;




  try{
    await eventModel.create({
      text: message,
      tgId: from.id,
      firstName: from.first_name,

    });
    await ctx.reply('Noted, keep texting me your thoughts. To generate the post, just enter the command: /generate');
  }catch(err){
    console.log(err);
    await ctx.reply('facing difficulties, please try again later');
  }
  
});



bot.launch();

// ENABLE GRACEFUL SHOUTDOWN
process.once('SIGINT',()=>bot.stop('SIGINT'));
process.once('SIGTERM',()=>bot.stop('SIGTERM'));