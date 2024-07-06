import mongoose from "mongoose";
import { Completions } from "openai/resources/completions.mjs";


const userSchema = mongoose.Schema({
  tgId:{
    type: String,
    required:true,
    unique:true,

  },
  firstName:{
    type: String,
    required:true,
  },
  lastName:{
    type: String,
    required:true,
  },
  isBot:{
    type: Boolean,
    required:true,
  },
username:{
  type: String,
  required:true,
  unique:true,
},
promptToken:{
  type:Number,
  required: false,
},
CompletionToken:{
  type : Number,
  require:false,
},
},
{timestamps:true}
);


export default mongoose.model('user',userSchema);