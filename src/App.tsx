import { useState, useEffect, useRef } from "react";

function timeAgo() {
  const opts = ["just now","2m","5m","12m","34m","1h","2h","4h"];
  return opts[Math.floor(Math.random() * opts.length)];
}

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function formatNum(n) {
  if (n >= 1000000) return (n/1000000).toFixed(1)+"M";
  if (n >= 1000) return (n/1000).toFixed(1)+"K";
  return String(n);
}

async function callClaude(system, user, maxTokens = 1000) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await res.json();
    if (data.error) {
      console.error("Claude API error:", data.error.type, data.error.message);
      return "";
    }
    const textBlock = data.content?.find(b => b.type === "text");
    const text = textBlock?.text || "";
    return text;
  } catch (err) {
    console.error("callClaude failed:", err);
    return "";
  }
}

const AVATAR_COLORS = [
  "#FF6B6B","#4ECDC4","#45B7D1","#96CEB4","#FFEAA7","#DDA0DD",
  "#98D8C8","#F7DC6F","#BB8FCE","#85C1E9","#F0A500","#E84393",
  "#00C2FF","#7FFF00","#FF7F50","#C39BD3","#76D7C4","#F9E79F",
];

function Avatar({ name, size = 40, color, verified }) {
  const c = color || AVATAR_COLORS[Math.abs((name||"?").charCodeAt(0)) % AVATAR_COLORS.length];
  const initials = name ? name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() : "?";
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      <div style={{
        width:size, height:size, borderRadius:"50%", background:c,
        display:"flex", alignItems:"center", justifyContent:"center",
        fontWeight:800, fontSize:size*0.38, color:"#0a0a0f",
        fontFamily:"'DM Mono',monospace", letterSpacing:-0.5,
      }}>{initials}</div>
      {verified && (
        <div style={{
          position:"absolute", bottom:-1, right:-1,
          width:size*0.38, height:size*0.38, borderRadius:"50%",
          background:"#1d9bf0", display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:size*0.22, color:"#fff",
          border:"2px solid #040408",
        }}>✓</div>
      )}
    </div>
  );
}

function PostContent({ content, allUsers, onMentionClick }) {
  const parts = content.split(/(@\w+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const handle = part.slice(1).toLowerCase();
          const user = allUsers?.find(u => u.handle?.toLowerCase() === handle);
          return (
            <span key={i}
              style={{ color:"#1d9bf0", fontWeight:600, cursor: user ? "pointer":"default" }}
              onClick={e => { e.stopPropagation(); if (user && onMentionClick) onMentionClick(user); }}
            >{part}</span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function ProfileModal({ user, isFollowing, onFollow, onClose, feedPosts, allUsers, relationship, onRelationshipChange }) {
  const [tab, setTab] = useState("posts");
  const userFeedPosts = feedPosts?.filter(p => p.author?.handle === user.handle) || [];
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(0,0,0,0.75)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"flex-start", justifyContent:"center",
      paddingTop:48, overflowY:"auto",
    }} onClick={onClose}>
      <div style={{
        width:"100%", maxWidth:500, background:"#0a0a0f",
        borderRadius:16, border:"1px solid #1a1a2e",
        animation:"fadeIn 0.2s ease", overflow:"hidden",
      }} onClick={e=>e.stopPropagation()}>
        <div style={{
          height:80,
          background:`linear-gradient(135deg, ${user.avatarColor||AVATAR_COLORS[0]}33, #0d0d1a)`,
          position:"relative"
        }}>
          <button onClick={onClose} style={{
            position:"absolute", top:12, right:12,
            background:"rgba(0,0,0,0.5)", border:"none", color:"#fff",
            borderRadius:"50%", width:32, height:32, cursor:"pointer",
            fontSize:16, display:"flex", alignItems:"center", justifyContent:"center"
          }}>✕</button>
        </div>
        <div style={{ padding:"0 20px 20px" }}>
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginTop:-28, marginBottom:12 }}>
            <Avatar name={user.name} size={60} color={user.avatarColor} verified={user.verified} />
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
              {["support","beef"].map(rel => (
                <button key={rel} onClick={() => onRelationshipChange(user.handle, rel)} style={{
                  padding:"6px 12px", borderRadius:20, fontSize:11, fontWeight:700,
                  cursor:"pointer", fontFamily:"'DM Mono',monospace",
                  border:`1px solid ${relationship===rel?(rel==="support"?"#00ba7c":"#f91880"):"#222"}`,
                  background:relationship===rel?(rel==="support"?"#00ba7c22":"#f9188022"):"transparent",
                  color:relationship===rel?(rel==="support"?"#00ba7c":"#f91880"):"#444",
                }}>{rel==="support"?"🤝 Support":"🔥 Beef"}</button>
              ))}
              <button onClick={() => onFollow(user.handle)} style={{
                padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:700,
                cursor:"pointer", fontFamily:"'Syne',sans-serif",
                background:isFollowing?"transparent":"#fff",
                color:isFollowing?"#aaa":"#040408",
                border:isFollowing?"1px solid #333":"none",
              }}>{isFollowing?"Following":"Follow"}</button>
            </div>
          </div>
          <div style={{ color:"#fff", fontSize:17, fontWeight:700 }}>{user.name}</div>
          <div style={{ color:"#444", fontSize:13, marginBottom:6 }}>@{user.handle}</div>
          {user.bio && <div style={{ color:"#888", fontSize:13, lineHeight:1.55, marginBottom:8 }}>{user.bio}</div>}
          {user.realWorldContext && <div style={{ color:"#4a8fb5", fontSize:11, marginBottom:8 }}>🌍 {user.realWorldContext}</div>}
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            <span style={{ color:"#888", fontSize:12 }}><b style={{color:"#fff"}}>{formatNum(user.followers||0)}</b> followers</span>
            <span style={{ color:"#888", fontSize:12 }}><b style={{color:"#fff"}}>{user.type||"user"}</b></span>
            {user.isRealWorld && <span style={{ color:"#f0a500", fontSize:11 }}>⭐ Real world figure</span>}
            {relationship && relationship!=="neutral" && (
              <span style={{ color:relationship==="support"?"#00ba7c":"#f91880", fontSize:12, fontWeight:700 }}>
                {relationship==="support"?"✊ You support them":"🔥 You're beefing"}
              </span>
            )}
          </div>
        </div>
        <div style={{ display:"flex", borderTop:"1px solid #111", borderBottom:"1px solid #111" }}>
          {["posts","about"].map(t => (
            <button key={t} onClick={()=>setTab(t)} style={{
              flex:1, padding:"12px", background:"none", border:"none",
              color:tab===t?"#fff":"#444", fontSize:12, fontWeight:700, cursor:"pointer",
              borderBottom:tab===t?"2px solid #fff":"2px solid transparent",
              fontFamily:"'DM Mono',monospace", letterSpacing:1, textTransform:"uppercase",
            }}>{t}</button>
          ))}
        </div>
        <div style={{ maxHeight:280, overflowY:"auto" }}>
          {tab==="posts" ? (
            userFeedPosts.length ? userFeedPosts.slice(0,8).map(p => (
              <div key={p.id} style={{ padding:"12px 20px", borderBottom:"1px solid #0d0d14" }}>
                <div style={{ color:"#888", fontSize:13, lineHeight:1.55 }}>{p.content}</div>
                <div style={{ color:"#333", fontSize:11, marginTop:5 }}>♡ {formatNum(p.likes||0)} · {p.time}</div>
              </div>
            )) : (
              <div style={{ padding:28, textAlign:"center", color:"#333", fontSize:13 }}>No posts yet in feed</div>
            )
          ) : (
            <div style={{ padding:20 }}>
              <div style={{ color:"#666", fontSize:13, lineHeight:2 }}>
                <div>Type: <span style={{color:"#ccc"}}>{user.type}</span></div>
                <div>Followers: <span style={{color:"#ccc"}}>{formatNum(user.followers||0)}</span></div>
                {user.verified && <div>Verified: <span style={{color:"#1d9bf0"}}>✓ Yes</span></div>}
                {user.isRealWorld && <div>Figure: <span style={{color:"#f0a500"}}>⭐ Real world</span></div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ComposeBox({ profile, allUsers, onPost, posting }) {
  const [text, setText] = useState("");
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const ref = useRef(null);

  function handleChange(e) {
    const val = e.target.value.slice(0,280);
    setText(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      setMentionQuery({ q, startIdx: cursor - match[0].length });
      setMentionResults((allUsers||[]).filter(u =>
        u.handle?.toLowerCase().startsWith(q) || u.name?.toLowerCase().startsWith(q)
      ).slice(0,6));
    } else {
      setMentionQuery(null); setMentionResults([]);
    }
  }

  function insertMention(user) {
    if (!mentionQuery) return;
    const before = text.slice(0, mentionQuery.startIdx);
    const after = text.slice(ref.current?.selectionStart || mentionQuery.startIdx);
    setText((before + `@${user.handle} ` + after).slice(0,280));
    setMentionQuery(null); setMentionResults([]);
    setTimeout(() => ref.current?.focus(), 0);
  }

  function submit() {
    if (!text.trim() || posting) return;
    onPost(text); setText(""); setMentionQuery(null); setMentionResults([]);
  }

  return (
    <div style={{ padding:"16px 20px", borderBottom:"1px solid #0f0f18", display:"flex", gap:12 }}>
      <Avatar name={profile?.name} size={44} color={profile?.avatarColor} />
      <div style={{ flex:1, position:"relative" }}>
        <textarea ref={ref} value={text} onChange={handleChange}
          onKeyDown={e => {
            if (e.key==="Escape") { setMentionQuery(null); setMentionResults([]); }
            if ((e.metaKey||e.ctrlKey) && e.key==="Enter") submit();
          }}
          placeholder="What's on your mind? @ to tag someone..."
          rows={3}
          style={{
            width:"100%", background:"transparent", border:"1px solid #111",
            borderRadius:10, padding:"12px 14px", color:"#ddd", fontSize:15,
            fontFamily:"inherit", resize:"none", lineHeight:1.55, outline:"none",
          }}
        />
        {mentionResults.length > 0 && (
          <div style={{
            position:"absolute", top:"100%", left:0, right:0, zIndex:100,
            background:"#0d0d18", border:"1px solid #1a1a2e", borderRadius:10,
            overflow:"hidden", boxShadow:"0 8px 32px rgba(0,0,0,0.7)",
          }}>
            {mentionResults.map(u => (
              <div key={u.handle} onMouseDown={e=>{e.preventDefault();insertMention(u);}}
                className="mention-row"
                style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid #111" }}>
                <Avatar name={u.name} size={28} verified={u.verified} />
                <div style={{ flex:1 }}>
                  <div style={{ color:"#fff", fontSize:13, fontWeight:600 }}>{u.name}</div>
                  <div style={{ color:"#444", fontSize:11 }}>@{u.handle} · {u.type||"user"}</div>
                </div>
                {u.isRealWorld && <span style={{ color:"#f0a500", fontSize:10 }}>⭐</span>}
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
          <span style={{ color:text.length>260?"#f91880":"#333", fontSize:11 }}>
            {text.length}/280 <span style={{color:"#1a1a1a",marginLeft:8}}>⌘↵</span>
          </span>
          <button onClick={submit} disabled={!text.trim()||posting} className="post-btn" style={{
            background:text.trim()?"#fff":"#0d0d14", color:text.trim()?"#040408":"#222",
            border:"none", borderRadius:20, padding:"8px 20px",
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Syne',sans-serif",
          }}>{posting?"...":"Post"}</button>
        </div>
      </div>
    </div>
  );
}

function ReplyComposer({ profile, onSubmit, replyingTo, onCancel }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);

  async function submit() {
    if (!text.trim() || sending) return;
    setSending(true);
    await onSubmit(text);
    setText(""); setSending(false);
  }

  return (
    <div style={{ display:"flex", gap:10, marginTop:10, paddingTop:10, borderTop:"1px solid #0d0d14" }} onClick={e=>e.stopPropagation()}>
      <Avatar name={profile?.name} size={28} color={profile?.avatarColor} />
      <div style={{ flex:1 }}>
        <textarea ref={ref} value={text} onChange={e=>setText(e.target.value.slice(0,280))}
          onKeyDown={e=>{ if ((e.metaKey||e.ctrlKey)&&e.key==="Enter") submit(); if(e.key==="Escape") onCancel(); }}
          placeholder={replyingTo ? `Replying to @${replyingTo}...` : "Write a reply..."}
          rows={2}
          style={{ width:"100%", background:"#080810", border:"1px solid #1a1a2e", borderRadius:8,
            padding:"8px 12px", color:"#ddd", fontSize:13, fontFamily:"inherit", resize:"none", outline:"none" }}
        />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
          <span style={{ color:"#222", fontSize:10 }}>⌘↵ to send · esc to cancel</span>
          <button onClick={submit} disabled={!text.trim()||sending} style={{
            background: text.trim() ? "#1d9bf0" : "#0d0d14", color: text.trim() ? "#fff" : "#333",
            border:"none", borderRadius:16, padding:"5px 14px", fontSize:12, fontWeight:700,
            cursor: text.trim() ? "pointer" : "default", fontFamily:"'Syne',sans-serif",
          }}>{sending ? "..." : "Reply"}</button>
        </div>
      </div>
    </div>
  );
}

// Detect if a post is negative/hateful toward a user
function detectSentiment(content, userHandle) {
  if (!content || !userHandle) return "neutral";
  const lower = content.toLowerCase();
  const mentionsUser = lower.includes(`@${userHandle.toLowerCase()}`) || lower.includes(userHandle.toLowerCase());
  if (!mentionsUser) return "neutral";
  const hateWords = ["trash","overrated","washed","clown","mid","flop","fraud","fake","never make it","won't make it","can't","shouldn't","overhyped","terrible","awful","horrible","garbage","bust","stop","quit","give up","embarrassing","joke","laughingstock","nobody","irrelevant"];
  const supportWords = ["goat","love","great","amazing","talented","fire","legit","real","respect","inspire","future","star","elite","believe","support","built different","next level","locked in"];
  const hateScore = hateWords.filter(w => lower.includes(w)).length;
  const supportScore = supportWords.filter(w => lower.includes(w)).length;
  if (hateScore > supportScore && hateScore > 0) return "hate";
  if (supportScore > hateScore && supportScore > 0) return "support";
  return "neutral";
}

// Sanitize AI output to fix common name/handle mangling
function fixNameInText(text, exactName, exactHandle) {
  if (!text) return text;
  let fixed = text;
  // Fix handle references — replace any @handle variant with exact handle
  if (exactHandle) {
    fixed = fixed.replace(new RegExp(`@${exactHandle}`, "gi"), `@${exactHandle}`);
  }
  // Fix name — use word-boundary replacement for common mangling patterns
  if (exactName) {
    const parts = exactName.trim().split(/\s+/);
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts.slice(1).join(" ");
      // Replace mangled versions like "Elie Pps", "eli pps", "Eli Pp" etc.
      // Match first name variant + space + last name variant (case insensitive)
      const firstEscaped = firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const lastEscaped = lastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      fixed = fixed.replace(
        new RegExp(`\\b${firstEscaped}\\w*\\s+${lastEscaped}\\w*\\b`, "gi"),
        exactName
      );
    }
  }
  return fixed;
}

function PostCard({ post, isUser, profile, allUsers, onLike, onExpand, expanded, onMentionClick, relationships, onUserReply, onUserReplyToReply, autoSentiments }) {
  const [replyingToPost, setReplyingToPost] = useState(false);
  const [replyingToReplyId, setReplyingToReplyId] = useState(null);

  const author = isUser ? profile : post.author;
  const rel = author?.handle ? relationships?.[author.handle] : null;
  const autoSent = autoSentiments?.[author?.handle];
  const effectiveRel = autoSent === "hate" ? "hate" : rel;
  const relColor = effectiveRel==="support"?"#00ba7c":effectiveRel==="beef"?"#f91880":effectiveRel==="hate"?"#ff4444":null;
  const relLabel = effectiveRel==="support"?"✊":effectiveRel==="beef"?"🔥":effectiveRel==="hate"?"💀":null;

  return (
    <div className="post-card" onClick={onExpand}
      style={{ padding:"16px 20px", borderBottom:"1px solid #0d0d14", background:"#0a0a0f", cursor:"pointer", animation:"fadeIn 0.35s ease" }}>
      <div style={{ display:"flex", gap:12 }}>
        <div style={{ cursor:!isUser?"pointer":"default" }}
          onClick={e=>{e.stopPropagation(); if(!isUser&&onMentionClick) onMentionClick(author);}}>
          <Avatar name={author?.name} size={44} color={isUser?profile?.avatarColor:author?.avatarColor} verified={author?.verified} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4, flexWrap:"wrap" }}>
            <span
              style={{ color:relColor||"#fff", fontWeight:700, fontSize:14, cursor:!isUser?"pointer":"default" }}
              onClick={e=>{e.stopPropagation();if(!isUser&&onMentionClick)onMentionClick(author);}}
            >{author?.name}</span>
            {author?.isRealWorld && <span style={{color:"#f0a500",fontSize:10}}>⭐</span>}
            {autoSent==="hate" && !isUser && (
              <span style={{background:"#ff444422",color:"#ff4444",fontSize:9,padding:"1px 6px",borderRadius:4,fontWeight:800,letterSpacing:0.5}}>HATER</span>
            )}
            <span style={{ color:"#444", fontSize:12 }}>@{author?.handle}</span>
            <span style={{ color:"#222", fontSize:12 }}>·</span>
            <span style={{ color:"#333", fontSize:12 }}>{post.time}</span>
            {post.isNew && <span style={{ background:"#1d9bf020", color:"#1d9bf0", fontSize:9, padding:"1px 6px", borderRadius:6, fontWeight:700 }}>NEW</span>}
            {relColor && <span style={{color:relColor,fontSize:11}}>{relLabel}</span>}
          </div>
          <div style={{ color:"#ccc", fontSize:14, lineHeight:1.65, marginBottom:12 }}>
            <PostContent content={post.content} allUsers={allUsers} onMentionClick={onMentionClick} />
          </div>
          <div style={{ display:"flex", gap:28 }} onClick={e=>e.stopPropagation()}>
            <button className="act-btn" onClick={e=>{e.stopPropagation();onExpand();setReplyingToPost(true);}} style={{ color:post.replies?.length?"#555":"#333" }}>
              💬 <span>{post.replies?.length||0}</span>
            </button>
            <button className="act-btn" style={{ color:post.retweetedByMe?"#00ba7c":"#333" }}>
              ↺ <span>{formatNum(post.retweets||0)}</span>
            </button>
            <button className="act-btn" onClick={onLike} style={{ color:post.likedByMe?"#f91880":"#333" }}>
              {post.likedByMe?"♥":"♡"} <span>{formatNum(post.likes||0)}</span>
            </button>
          </div>

          {expanded && (
            <div style={{ marginTop:14, borderTop:"1px solid #111", paddingTop:14 }} onClick={e=>e.stopPropagation()}>
              {replyingToPost && (
                <ReplyComposer
                  profile={profile}
                  replyingTo={author?.handle}
                  onSubmit={async (text) => { await onUserReply(post.id, text, null); setReplyingToPost(false); }}
                  onCancel={() => setReplyingToPost(false)}
                />
              )}
              {!replyingToPost && (
                <div style={{marginBottom:10}} onClick={e=>e.stopPropagation()}>
                  <button onClick={e=>{e.stopPropagation();setReplyingToPost(true);}} style={{
                    background:"none",border:"1px solid #1a1a2e",borderRadius:20,
                    padding:"5px 14px",color:"#444",fontSize:12,cursor:"pointer",fontFamily:"'DM Mono',monospace"
                  }}>+ Reply</button>
                </div>
              )}

              {post.loadingReplies ? (
                <div style={{ color:"#333", fontSize:12, animation:"pulse 1.5s infinite" }}>generating replies...</div>
              ) : post.replies?.length > 0 ? post.replies.map(r => {
                const rAutoSent = autoSentiments?.[r.author?.handle];
                return (
                  <div key={r.id} style={{ marginBottom:14, paddingLeft:10, borderLeft:"2px solid #1a1a1a", animation:"fadeIn 0.3s ease" }}>
                    <div style={{ display:"flex", gap:10 }}>
                      <div style={{ cursor:"pointer" }} onClick={e=>{e.stopPropagation();if(onMentionClick)onMentionClick(r.author);}}>
                        <Avatar name={r.author?.name} size={32} verified={r.author?.verified} color={r.author?.avatarColor} />
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", gap:5, alignItems:"center", marginBottom:3, flexWrap:"wrap" }}>
                          <span style={{ color:"#bbb", fontSize:13, fontWeight:700, cursor:"pointer" }}
                            onClick={e=>{e.stopPropagation();if(onMentionClick)onMentionClick(r.author);}}
                          >{r.author?.name}</span>
                          {rAutoSent==="hate" && (
                            <span style={{background:"#ff444422",color:"#ff4444",fontSize:9,padding:"1px 5px",borderRadius:4,fontWeight:800}}>HATER</span>
                          )}
                          <span style={{ color:"#333", fontSize:11 }}>@{r.author?.handle}</span>
                          <span style={{ color:"#222", fontSize:11 }}>· {r.time}</span>
                        </div>
                        <div style={{ color:"#888", fontSize:13, lineHeight:1.55, marginBottom:6 }}>
                          <PostContent content={r.content} allUsers={allUsers} onMentionClick={onMentionClick} />
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                          <span style={{ color:"#333", fontSize:11 }}>♡ {formatNum(r.likes)}</span>
                          <button onClick={e=>{e.stopPropagation(); setReplyingToReplyId(replyingToReplyId===r.id?null:r.id);}} style={{
                            background:"none",border:"none",color:"#333",fontSize:11,cursor:"pointer",fontFamily:"inherit",padding:0
                          }}>💬 Reply</button>
                        </div>
                        {r.replies?.length > 0 && (
                          <div style={{marginTop:8,paddingLeft:8,borderLeft:"2px solid #111"}}>
                            {r.replies.map(sr => (
                              <div key={sr.id} style={{display:"flex",gap:8,marginBottom:10,animation:"fadeIn 0.3s ease"}}>
                                <Avatar name={sr.author?.name} size={24} color={sr.author?.handle===profile?.handle?profile?.avatarColor:sr.author?.avatarColor} />
                                <div style={{flex:1}}>
                                  <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:2,flexWrap:"wrap"}}>
                                    <span style={{color:"#aaa",fontSize:12,fontWeight:700}}>{sr.author?.name}</span>
                                    <span style={{color:"#333",fontSize:10}}>@{sr.author?.handle}</span>
                                    <span style={{color:"#222",fontSize:10}}>· {sr.time}</span>
                                  </div>
                                  <div style={{color:"#666",fontSize:12,lineHeight:1.5}}>
                                    <PostContent content={sr.content} allUsers={allUsers} onMentionClick={onMentionClick}/>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {replyingToReplyId===r.id && (
                          <ReplyComposer
                            profile={profile}
                            replyingTo={r.author?.handle}
                            onSubmit={async (text) => { await onUserReplyToReply(post.id, r.id, text); setReplyingToReplyId(null); }}
                            onCancel={() => setReplyingToReplyId(null)}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div style={{ color:"#333", fontSize:12 }}>No replies yet.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorldChip({ world }) {
  if (!world) return null;
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:6,
      background:"#0a1628", border:"1px solid #1a3a5a",
      borderRadius:20, padding:"4px 12px", marginTop:8,
      animation:"fadeIn 0.3s ease",
    }}>
      <div style={{ width:6, height:6, borderRadius:"50%", background:"#4a8fb5" }} />
      <span style={{ color:"#4a8fb5", fontSize:11, fontWeight:600 }}>{world}</span>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("onboarding");
  const [form, setForm] = useState({ name:"", handle:"", bio:"" });
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [realWorldCandidates, setRealWorldCandidates] = useState([]);
  const [pickedFigures, setPickedFigures] = useState([]);
  const [aiUsers, setAiUsers] = useState([]);
  const [feedPosts, setFeedPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [posting, setPosting] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState([]);
  const [worldContext, setWorldContext] = useState(null);
  const [generatingFeed, setGeneratingFeed] = useState(false);
  const [expandedPost, setExpandedPost] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [relationships, setRelationships] = useState({});
  const [autoSentiments, setAutoSentiments] = useState({});
  const [detectedWorld, setDetectedWorld] = useState("");
  const [detectingWorld, setDetectingWorld] = useState(false);
  const worldDetectTimer = useRef(null);

  const periodicRef = useRef(null);
  const profileRef = useRef(null);
  const aiUsersRef = useRef([]);
  const followersRef = useRef(0);
  const worldRef = useRef(null);

  useEffect(()=>{profileRef.current=profile;},[profile]);
  useEffect(()=>{aiUsersRef.current=aiUsers;},[aiUsers]);
  useEffect(()=>{followersRef.current=followers;},[followers]);
  useEffect(()=>{worldRef.current=worldContext;},[worldContext]);
  useEffect(()=>()=>{
    if(periodicRef.current) clearTimeout(periodicRef.current);
    if(worldDetectTimer.current) clearTimeout(worldDetectTimer.current);
  },[]);

  // Build a name-safety instruction to inject into every AI prompt
  function nameGuard(prof) {
    if (!prof) return "";
    return `CRITICAL: The user's exact name is "${prof.name}" and their exact handle is "@${prof.handle}". You MUST spell both perfectly every single time. Do not alter, abbreviate, or mangle either. Copy them character-for-character.`;
  }

  function handleBioChange(val) {
    setForm(p=>({...p, bio:val}));
    if (worldDetectTimer.current) clearTimeout(worldDetectTimer.current);
    if (val.trim().length < 15) { setDetectedWorld(""); return; }
    worldDetectTimer.current = setTimeout(async () => {
      setDetectingWorld(true);
      const result = await callClaude(
        "You identify someone's professional world/industry from a bio. Respond with ONLY 2-4 words, e.g. 'NBA Basketball', 'Tech Startups', 'Hip-Hop Music', 'Fashion Modeling'. Nothing else.",
        `Bio: "${val}"`
      );
      setDetectedWorld(result.trim().replace(/^["']|["']$/g,"").slice(0,30));
      setDetectingWorld(false);
    }, 800);
  }

  async function handleOnboard() {
    if (!form.name||!form.handle||!form.bio) return;
    setGeneratingFeed(true);

    const raw = await callClaude(
      `You generate JSON data about social media worlds. Output ONLY raw JSON — no markdown, no backticks, no explanation, nothing before or after the JSON object.`,
      `User bio: "${form.bio}"
User name: "${form.name}"

Output this JSON object (no markdown, no backticks, just raw JSON):
{"world":{"industry":"NBA Basketball","topics":["topic1","topic2","topic3","topic4","topic5"],"lingo":["word1","word2","word3","word4"]},"realWorldFigures":[{"name":"LeBron James","handle":"kingjames","bio":"4x NBA Champion, Lakers forward","type":"legend","verified":true,"followers":52000000,"realWorldContext":"All-time scoring leader","realWorldIdentity":"LeBron James is a 4x NBA champion who posts about his games, business ventures, family, and social activism. He is known for posting workout videos, game reactions, and promoting his media company.","theirTopics":["NBA games","his business empire","social justice"]},{"name":"Stephen Curry","handle":"stephencurry30","bio":"4x NBA Champion, Warriors PG","type":"competitor","verified":true,"followers":18000000,"realWorldContext":"Greatest shooter of all time","realWorldIdentity":"Steph Curry posts about Warriors games, his golf hobby, family life, and his charitable foundation. Known for behind-the-scenes basketball content.","theirTopics":["Warriors games","golf","family"]}]}

Replace the example figures with 10 REAL people from the SAME world as the user's bio. Keep the exact same JSON structure. Each person must be a real well-known figure in that world with accurate follower counts and real information about who they actually are and what they post about. Return ONLY the JSON object.`
    , 3000);

    let parsed = null;
    try {
      const cleaned = raw.replace(/```[\w\s]*\n?/g,"").replace(/```/g,"").trim();
      const jsonStart = cleaned.indexOf("{");
      const jsonEnd = cleaned.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd+1));
      }
    } catch(e) {
      console.error("Parse error:", e);
    }

    if (parsed?.realWorldFigures?.length) {
      setWorldContext(parsed.world);
      worldRef.current = parsed.world;
      const figures = parsed.realWorldFigures.map(f=>({
        ...f, isRealWorld:true,
        realWorldIdentity: f.realWorldIdentity || f.bio,
        theirTopics: f.theirTopics || [],
        avatarColor: AVATAR_COLORS[Math.abs((f.name||"").charCodeAt(0))%AVATAR_COLORS.length],
      }));
      setRealWorldCandidates(figures);
    } else {
      const retry = await callClaude(
        `Output ONLY a raw JSON object. No markdown. No backticks. No explanation.`,
        `Give me a JSON object with this structure for someone with bio "${form.bio}":
{"world":{"industry":"string","topics":["s","s","s","s","s"],"lingo":["s","s","s","s"]},"realWorldFigures":[10 real famous people from that world, each with name/handle/bio/type/verified/followers/realWorldContext/realWorldIdentity/theirTopics fields]}
Raw JSON only:`
      , 3000);
      try {
        const c2 = retry.replace(/```[\w\s]*\n?/g,"").replace(/```/g,"").trim();
        const s = c2.indexOf("{"), e = c2.lastIndexOf("}");
        if (s !== -1 && e !== -1) parsed = JSON.parse(c2.slice(s, e+1));
      } catch(e2) { console.error("Retry parse error:", e2); }

      if (parsed?.realWorldFigures?.length) {
        setWorldContext(parsed.world);
        worldRef.current = parsed.world;
        setRealWorldCandidates(parsed.realWorldFigures.map(f=>({
          ...f, isRealWorld:true,
          realWorldIdentity: f.realWorldIdentity || f.bio,
          theirTopics: f.theirTopics || [],
          avatarColor: AVATAR_COLORS[Math.abs((f.name||"").charCodeAt(0))%AVATAR_COLORS.length],
        })));
      } else {
        setWorldContext({ industry: detectedWorld || "General", topics:[], lingo:[] });
        setRealWorldCandidates([]);
      }
    }
    setGeneratingFeed(false);
    setScreen("picking");
  }

  async function handleFinishPicking() {
    setGeneratingFeed(true);
    const colorIdx = randInt(0,AVATAR_COLORS.length-1);
    const p = {
      name:form.name, handle:form.handle.replace(/^@/,"").replace(/\s/g,""),
      bio:form.bio, avatarColor:AVATAR_COLORS[colorIdx], verified:false,
    };
    setProfile(p); profileRef.current=p;
    const initFollowers = randInt(300,3000);
    setFollowers(initFollowers); followersRef.current=initFollowers;
    const picked = realWorldCandidates.filter(f=>pickedFigures.includes(f.handle));
    const world = worldRef.current;

    const aiRaw = await callClaude(
      `Output ONLY a raw JSON array. No markdown, no backticks, no explanation.`,
      `Generate 8 fictional social media personas who exist in the world of "${world?.industry||p.bio}".
These are fans, critics, journalists, analysts, haters, and supporters who follow this scene.
They are NOT the main user (${p.name}). They have their own identities.

Output a JSON array of 8 objects:
[{"name":"Mike Torres","handle":"miketorres_hoops","bio":"Scout for IMG Academy, been watching prep talent for 12 years","type":"analyst","verified":false,"followers":8400},...]

Return ONLY the JSON array, starting with [ and ending with ]`
    , 1500);

    let aiPersonas = [];
    try {
      const c = aiRaw.replace(/```[\w\s]*\n?/g,"").replace(/```/g,"").trim();
      const s = c.indexOf("["), e = c.lastIndexOf("]");
      if (s !== -1 && e !== -1) aiPersonas = JSON.parse(c.slice(s, e+1));
    } catch(e) { console.error("aiPersonas parse:", e, aiRaw.slice(0,200)); }

    if (!aiPersonas.length) {
      aiPersonas = [
        {name:"Marcus Webb",handle:"marcuswebb_",bio:`${world?.industry||"industry"} analyst and commentator`,type:"analyst",verified:false,followers:12000},
        {name:"Jordan Reeves",handle:"jreeves_live",bio:"Journalist covering the scene",type:"journalist",verified:false,followers:8500},
        {name:"Dana Cruz",handle:"danacruz99",bio:"Die-hard fan, always watching",type:"fan",verified:false,followers:3200},
        {name:"Terry Mills",handle:"terrymills_real",bio:"Skeptic. Show me the receipts.",type:"critic",verified:false,followers:5600},
        {name:"Aaliyah Stone",handle:"aaliyahstone",bio:"Content creator in the space",type:"fan",verified:false,followers:22000},
        {name:"Chris Volta",handle:"chrisvolta",bio:"Agent and talent scout",type:"executive",verified:false,followers:9800},
      ];
    }

    aiPersonas = aiPersonas.map(a=>({
      ...a, isRealWorld:false,
      avatarColor:AVATAR_COLORS[Math.abs((a.name||"").charCodeAt(0))%AVATAR_COLORS.length],
    }));

    const allPersonas = [...picked, ...aiPersonas];
    setAiUsers(allPersonas); aiUsersRef.current=allPersonas;

    const pickedDesc = picked.length > 0
      ? picked.map((f,i)=>`  [${i}] ${f.name} (@${f.handle}) — REAL PERSON: ${f.realWorldIdentity||f.bio}. Posts about: ${(f.theirTopics||[]).join(", ")||"their career and life"}`).join("\n")
      : "  (none selected)";
    const aiDesc = aiPersonas.map((a,i)=>`  [${picked.length+i}] ${a.name} (@${a.handle}) — ${a.bio}`).join("\n");

    const feedRaw = await callClaude(
      `Output ONLY a raw JSON array. No markdown, no backticks, no explanation.
${nameGuard(p)}`,
      `Generate a social media feed of 12 posts. World: "${world?.industry||p.bio}". Lingo: ${world?.lingo?.join(", ")||"authentic slang"}.

REAL FIGURES (indices 0-${picked.length-1}) — these post about THEIR OWN careers/lives, NOT about @${p.handle}:
${pickedDesc}

AI PERSONAS (indices ${picked.length}-${allPersonas.length-1}) — these occasionally discuss @${p.handle} (exact spelling: "${p.name}"):
${aiDesc}

RULES:
- Real figures (indices 0-${picked.length-1}): post about THEIR OWN world. Do NOT mention @${p.handle}.
- AI personas: 5 posts = pure industry talk, 2 posts = casually mention @${p.handle}, 1 post = opinion about @${p.handle}
- When mentioning the user: their handle is EXACTLY @${p.handle} and their name is EXACTLY "${p.name}" — copy these character-for-character
- Spread author indices — don't use the same person twice in a row
- Use realistic likes for each person's follower count

Output JSON array:
[{"authorIndex":0,"content":"tweet text max 220 chars","likes":45000,"retweets":3200,"time":"2h"},...]

Return ONLY the array.`
    , 2000);

    let feed = [];
    try {
      const c = feedRaw.replace(/```[\w\s]*\n?/g,"").replace(/```/g,"").trim();
      const s = c.indexOf("["), e = c.lastIndexOf("]");
      if (s !== -1 && e !== -1) {
        const arr = JSON.parse(c.slice(s, e+1));
        arr.forEach((item, i) => {
          const idx = Math.max(0, Math.min(item.authorIndex??i%allPersonas.length, allPersonas.length-1));
          const author = allPersonas[idx];
          if (!author || !item.content) return;
          const isReal = author.isRealWorld;
          const maxLikes = isReal
            ? Math.max(1000, Math.floor((author.followers||500000)*0.015))
            : Math.max(20, Math.floor((author.followers||5000)*0.01));
          // Fix any name mangling in feed content
          const cleanContent = fixNameInText(item.content, p.name, p.handle);
          feed.push({
            id:`feed-${i}-${Date.now()}`,
            author,
            content: cleanContent,
            likes: Math.min(item.likes||randInt(isReal?500:5, isReal?5000:200), maxLikes),
            retweets: item.retweets||randInt(isReal?50:0, isReal?500:20),
            time: item.time||timeAgo(),
            replies:[], likedByMe:false, retweetedByMe:false,
          });
        });
      }
    } catch(e) { console.error("feed parse:", e, feedRaw.slice(0,300)); }

    if (!feed.length && allPersonas.length > 0) {
      const topics = world?.topics || ["the grind", "staying focused", "level up"];
      feed = allPersonas.slice(0, 6).map((author, i) => ({
        id:`fallback-${i}-${Date.now()}`,
        author,
        content: author.isRealWorld
          ? `${topics[i % topics.length]} — that's what it's about. No shortcuts.`
          : `Everyone in ${world?.industry||"the game"} is watching. The landscape is shifting.`,
        likes: author.isRealWorld ? randInt(5000,50000) : randInt(20,500),
        retweets: randInt(10,200),
        time: timeAgo(),
        replies:[], likedByMe:false, retweetedByMe:false,
      }));
    }

    feed = feed.sort(() => Math.random() - 0.5);
    setFeedPosts(feed);
    feed.forEach(fp => {
      if (fp.author && p) {
        const sent = detectSentiment(fp.content, p.handle);
        if (sent === "hate") setAutoSentiments(prev => ({...prev, [fp.author.handle]: "hate"}));
      }
    });
    setGeneratingFeed(false);
    setScreen("app");
    schedulePeriodicPost(allPersonas, p, world);

    // Seed initial feed posts with AI replies
    feed.slice(0, 5).forEach((fp, i) => {
      setTimeout(async () => {
        const replierPool = allPersonas.filter(a => a.handle !== fp.author?.handle);
        if (!replierPool.length) return;
        const replier = replierPool[randInt(0, replierPool.length-1)];
        let rText = "";
        try {
          rText = await callClaude(
            `You are ${replier.name} (@${replier.handle}), ${replier.type||"user"}. Bio: "${replier.bio}". Respond with ONLY the reply text, no quotes.
${nameGuard(p)}`,
            `Reply to this post by ${fp.author?.name}: "${fp.content}"\nShort genuine reaction (max 160 chars). Just the text.`
          );
        } catch(e) { return; }
        if (!rText.trim()) return;
        const cleanReply = fixNameInText(rText.trim().replace(/^["']|["']$/g,""), p.name, p.handle);
        const reply = {
          id: `seed-reply-${Date.now()}-${i}`,
          author: replier,
          content: cleanReply,
          likes: randInt(1, 30),
          time: timeAgo(),
          replies: [],
        };
        setFeedPosts(prev => prev.map(fp2 => fp2.id === fp.id ? {...fp2, replies:[...fp2.replies, reply]} : fp2));
      }, (i + 1) * 5000 + randInt(1000, 4000));
    });
  }

  function togglePickFigure(handle) {
    setPickedFigures(prev => prev.includes(handle)?prev.filter(h=>h!==handle):[...prev,handle]);
  }

  function schedulePeriodicPost(personas, prof, world) {
    if (periodicRef.current) clearTimeout(periodicRef.current);
    const delay = randInt(12000, 25000);
    periodicRef.current = setTimeout(async () => {
      const currentPersonas = aiUsersRef.current;
      const currentProf = profileRef.current;
      const currentWorld = worldRef.current;
      const reschedule = () => schedulePeriodicPost(null, null, null);

      if (!currentPersonas.length || !currentProf) { reschedule(); return; }

      const persona = currentPersonas[randInt(0, currentPersonas.length-1)];
      const isRealPerson = persona.isRealWorld;

      let systemPrompt, userPrompt;

      if (isRealPerson) {
        systemPrompt = `You are ${persona.name} (@${persona.handle}). ${persona.realWorldIdentity || persona.bio} Write in your authentic real-world voice. Respond with ONLY the tweet text, no quotes.
${nameGuard(currentProf)}`;
        userPrompt = `Write ONE tweet (max 200 chars) about something YOU (${persona.name}) would actually post about today.
Topics: ${(persona.theirTopics||[]).join(", ")||"your career, opinions, industry news"}
Do NOT make this about @${currentProf.handle}. Just the tweet text.`;
      } else {
        const dice = Math.random();
        systemPrompt = `You are ${persona.name} (@${persona.handle}), ${persona.type}. Bio: "${persona.bio}". Write authentic social media content. Respond with ONLY the tweet text, no quotes.
${nameGuard(currentProf)}`;
        if (dice < 0.55) {
          userPrompt = `Write ONE tweet (max 200 chars) about ${currentWorld?.industry||"the industry"}. Topics: ${currentWorld?.topics?.join(", ")||"the field"}. Do NOT mention @${currentProf.handle}. Just the tweet text.`;
        } else if (dice < 0.80) {
          userPrompt = `Write ONE tweet (max 200 chars) casually mentioning @${currentProf.handle} (name: "${currentProf.name}") in passing. Keep focus on ${currentWorld?.industry}. Use the EXACT handle @${currentProf.handle} and EXACT name "${currentProf.name}". Just tweet text.`;
        } else {
          userPrompt = `Write ONE tweet (max 200 chars) with your opinion on @${currentProf.handle} (name: "${currentProf.name}", bio: "${currentProf.bio}"). Be direct. Use EXACT handle @${currentProf.handle} and EXACT name "${currentProf.name}". Just tweet text.`;
        }
      }

      let text = "";
      try { text = await callClaude(systemPrompt, userPrompt); } catch(e) { reschedule(); return; }
      if (!text.trim()) { reschedule(); return; }

      const cleanText = fixNameInText(text.trim().replace(/^["']|["']$/g,""), currentProf.name, currentProf.handle);

      const maxLikes = isRealPerson
        ? Math.max(1000, Math.floor((persona.followers||1000000)*0.01))
        : Math.max(20, Math.floor((persona.followers||5000)*0.005));
      const likes = randInt(isRealPerson?500:2, maxLikes);
      const postId = `periodic-${Date.now()}`;
      const newPost = {
        id: postId,
        author: persona,
        content: cleanText,
        likes, retweets: randInt(0, Math.floor(likes/4)),
        time: "just now", replies: [], likedByMe: false, retweetedByMe: false, isNew: true,
      };

      setFeedPosts(prev => [newPost, ...prev]);
      setTimeout(() => setFeedPosts(prev => prev.map(p => p.id===postId ? {...p, isNew:false} : p)), 8000);

      const sent = detectSentiment(newPost.content, currentProf.handle);
      if (sent === "hate") setAutoSentiments(prev => ({...prev, [persona.handle]: "hate"}));

      const mentionsUser = newPost.content.toLowerCase().includes(`@${currentProf.handle.toLowerCase()}`);
      if (mentionsUser) {
        setNotifications(prev => [{id:postId, from:persona, preview:newPost.content, time:"just now", read:false, type:"mention"}, ...prev]);
      }

      setTimeout(async () => {
        const replierPool = currentPersonas.filter(p => p.handle !== persona.handle);
        if (!replierPool.length) return;
        const numRepliers = randInt(1, 2);
        const repliers = [...replierPool].sort(() => Math.random()-0.5).slice(0, numRepliers);
        const newReplies = [];
        for (const replier of repliers) {
          let rText = "";
          try {
            rText = await callClaude(
              `You are ${replier.name} (@${replier.handle}), ${replier.type||"user"}. Bio: "${replier.bio}". Respond with ONLY the reply text, no quotes.
${nameGuard(currentProf)}`,
              `Reply to this post by ${persona.name}: "${newPost.content}"
Write a short genuine reaction (max 180 chars). Stay in character. If you mention the user, their name is EXACTLY "${currentProf.name}" and handle is EXACTLY @${currentProf.handle}. Just the text.`
            );
          } catch(e) { continue; }
          if (!rText.trim()) continue;
          const cleanR = fixNameInText(rText.trim().replace(/^["']|["']$/g,""), currentProf.name, currentProf.handle);
          newReplies.push({
            id: `ar-${Date.now()}-${Math.random()}`,
            author: replier,
            content: cleanR,
            likes: randInt(1, 40),
            time: "just now",
            replies: [],
          });
        }
        if (newReplies.length) {
          setFeedPosts(prev => prev.map(p => p.id===postId ? {...p, replies:[...p.replies, ...newReplies]} : p));
        }
      }, randInt(8000, 20000));

      reschedule();
    }, delay);
  }

  async function handlePost(content) {
    if (!content.trim()||posting) return;
    setPosting(true);
    const taggedHandles = (content.match(/@(\w+)/g)||[]).map(m=>m.slice(1).toLowerCase());
    const taggedUsers = aiUsersRef.current.filter(u=>taggedHandles.includes(u.handle?.toLowerCase()));
    const myLikes = randInt(1, Math.max(3, Math.floor(followersRef.current*0.015)));
    const newPost = {
      id:`user-${Date.now()}`,
      author:profileRef.current,
      content,
      likes:myLikes,
      retweets:randInt(0,Math.floor(myLikes/3)),
      time:"just now",
      replies:[], likedByMe:false, retweetedByMe:false,
      isUserPost:true, loadingReplies:true,
    };
    setFeedPosts(prev=>[newPost,...prev]);
    setPosting(false);
    setFollowers(f=>f+randInt(1,Math.max(2,Math.floor(f/40))));

    const world = worldRef.current;
    const fol = followersRef.current;
    const allP = aiUsersRef.current;
    const prof = profileRef.current;
    const randomOthers = [...allP]
      .filter(u=>!taggedHandles.includes(u.handle?.toLowerCase()))
      .sort(()=>Math.random()-0.5)
      .slice(0, Math.max(0,(fol>10000?4:2)-taggedUsers.length));
    const repliers = [...taggedUsers, ...randomOthers];
    const replies = [];
    for (const persona of repliers) {
      const isTagged = taggedHandles.includes(persona.handle?.toLowerCase());
      const text = await callClaude(
        `You are ${persona.name} (@${persona.handle}), ${persona.type}. Bio: "${persona.bio}". Natural social media voice. Lingo: ${world?.lingo?.join(", ")||""}. Respond with ONLY the reply text.
${nameGuard(prof)}`,
        `Post from @${prof?.handle} (name: "${prof?.name}"): "${content}"
Bio: "${prof?.bio}", ${formatNum(fol)} followers.
${isTagged?"You were tagged — respond to them specifically.":"Write a reply."}
If you mention the user, use their EXACT name "${prof?.name}" and EXACT handle @${prof?.handle}.
Max 220 chars. Just the text.`
      );
      if (!text.trim()) continue;
      const replyLikes = Math.max(0, Math.floor(myLikes * Math.random() * 0.7));
      const cleanText = fixNameInText(text.trim().replace(/^["']|["']$/g,""), prof?.name, prof?.handle);
      replies.push({
        id:`reply-${Date.now()}-${Math.random()}`,
        author:persona,
        content:cleanText,
        likes:replyLikes,
        time:timeAgo(),
      });
    }
    const notifs = replies.map(r=>({
      id:r.id, from:r.author, preview:r.content,
      time:"just now", read:false, type:"reply"
    }));
    setNotifications(prev=>[...notifs,...prev]);
    setFeedPosts(prev=>prev.map(p=>
      p.id===newPost.id?{...p,replies,loadingReplies:false}:p
    ));
  }

  function toggleFollow(handle) {
    setFollowing(prev=>prev.includes(handle)?prev.filter(h=>h!==handle):[...prev,handle]);
  }

  function setRelationship(handle, rel) {
    setRelationships(prev=>({...prev,[handle]:rel===prev[handle]?"neutral":rel}));
  }

  function scanPostSentiment(content, authorHandle) {
    const prof = profileRef.current;
    if (!prof || !authorHandle || authorHandle === prof.handle) return;
    const sent = detectSentiment(content, prof.handle);
    if (sent === "hate") {
      setAutoSentiments(prev => ({ ...prev, [authorHandle]: "hate" }));
    }
  }

  async function handleUserReply(postId, text, _ignored) {
    if (!text.trim()) return;
    const prof = profileRef.current;
    const userReply = {
      id: `ur-${Date.now()}`,
      author: prof,
      content: text,
      likes: 0,
      time: "just now",
      replies: [],
    };
    setFeedPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, replies: [...(p.replies||[]), userReply] };
    }));
    setNotifications(prev=>[{id:userReply.id, from:prof, preview:text, time:"just now", read:true, type:"reply"},...prev]);

    const post = feedPosts.find(p => p.id === postId);
    const responder = post?.author;
    if (!responder || responder.handle === prof?.handle) return;

    const aiText = await callClaude(
      `You are ${responder.name} (@${responder.handle}). ${responder.bio||""}. Respond with ONLY the reply text, no quotes.
${nameGuard(prof)}`,
      `@${prof.handle} (name: "${prof.name}") just replied to your post saying: "${text}"
Your original post: "${post?.content}"
Write a short reply back (max 200 chars). If you mention them, use EXACT name "${prof.name}" and EXACT handle @${prof.handle}. Just the text.`
    );
    if (!aiText.trim()) return;
    const cleanAi = fixNameInText(aiText.trim().replace(/^["']|["']$/g,""), prof.name, prof.handle);
    const aiReply = {
      id: `air-${Date.now()}`,
      author: responder,
      content: cleanAi,
      likes: randInt(1, 50),
      time: "just now",
      replies: [],
    };
    setFeedPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, replies: [...(p.replies||[]), aiReply] };
    }));
    setNotifications(prev=>[{id:aiReply.id, from:responder, preview:aiReply.content, time:"just now", read:false, type:"reply"},...prev]);
    scanPostSentiment(aiReply.content, responder.handle);
  }

  async function handleUserReplyToReply(postId, replyId, text) {
    if (!text.trim()) return;
    const prof = profileRef.current;
    const userSubReply = {
      id: `usr-${Date.now()}`,
      author: prof,
      content: text,
      likes: 0,
      time: "just now",
    };
    setFeedPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, replies: (p.replies||[]).map(r => {
        if (r.id !== replyId) return r;
        return { ...r, replies: [...(r.replies||[]), userSubReply] };
      })};
    }));

    const post = feedPosts.find(p => p.id === postId);
    const reply = post?.replies?.find(r => r.id === replyId);
    const responder = reply?.author;
    if (!responder || responder.handle === prof?.handle) return;

    const aiText = await callClaude(
      `You are ${responder.name} (@${responder.handle}). ${responder.bio||""}. Respond with ONLY the reply text, no quotes.
${nameGuard(prof)}`,
      `@${prof.handle} (name: "${prof.name}") replied to you in a thread saying: "${text}"
Your previous reply was: "${reply?.content}"
Original post: "${post?.content}"
Write a short reply (max 180 chars). If you mention them, use EXACT name "${prof.name}" and EXACT handle @${prof.handle}. Just the text.`
    );
    if (!aiText.trim()) return;
    const cleanAi = fixNameInText(aiText.trim().replace(/^["']|["']$/g,""), prof.name, prof.handle);
    const aiSub = {
      id: `ais-${Date.now()}`,
      author: responder,
      content: cleanAi,
      likes: randInt(1,30),
      time: "just now",
    };
    setFeedPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      return { ...p, replies: (p.replies||[]).map(r => {
        if (r.id !== replyId) return r;
        return { ...r, replies: [...(r.replies||[]), aiSub] };
      })};
    }));
    setNotifications(prev=>[{id:aiSub.id, from:responder, preview:aiSub.content, time:"just now", read:false, type:"reply"},...prev]);
    scanPostSentiment(aiSub.content, responder.handle);
  }

  const unreadNotifs = notifications.filter(n=>!n.read).length;
  const allMentionableUsers = [...aiUsers];

  // ─── ONBOARDING ───
  if (screen==="onboarding") {
    return (
      <div style={{ minHeight:"100vh", background:"#040408", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Mono',monospace", padding:20 }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500&family=Syne:wght@700;800;900&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}body{background:#040408}
          ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
          input,textarea{outline:none;caret-color:#fff}
          @keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
          .ob-inp:focus{border-color:#333!important;background:#0d0d14!important}
          .cta{transition:all .22s}.cta:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(255,255,255,0.08)}
        `}</style>
        {generatingFeed?(
          <div style={{textAlign:"center",color:"#fff"}}>
            <div style={{fontSize:52,marginBottom:18}}>⚡</div>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:28,fontWeight:900,marginBottom:10}}>Analyzing your world...</div>
            <div style={{color:"#333",fontSize:11,letterSpacing:2,animation:"pulse 1.5s infinite"}}>FINDING REAL-WORLD FIGURES</div>
          </div>
        ):(
          <div style={{width:"100%",maxWidth:440}}>
            <div style={{textAlign:"center",marginBottom:48,animation:"fadeIn .5s ease"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:50,fontWeight:900,letterSpacing:-3,color:"#fff",lineHeight:1}}>echo.</div>
              <div style={{color:"#333",fontSize:11,letterSpacing:3,marginTop:8}}>AI SOCIAL SIMULATION</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:18}}>
              {[{label:"Display Name",key:"name",placeholder:"LeBron James"},{label:"@Handle",key:"handle",placeholder:"kingjames"}].map(f=>(
                <div key={f.key} style={{animation:"fadeIn .5s ease"}}>
                  <label style={{color:"#444",fontSize:10,letterSpacing:2.5,textTransform:"uppercase",display:"block",marginBottom:7}}>{f.label}</label>
                  <input className="ob-inp" value={form[f.key]} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder}
                    style={{width:"100%",background:"#080810",border:"1px solid #1a1a1a",borderRadius:10,padding:"13px 16px",color:"#fff",fontSize:14,fontFamily:"inherit"}}/>
                </div>
              ))}
              <div style={{animation:"fadeIn .5s .1s ease both"}}>
                <label style={{color:"#444",fontSize:10,letterSpacing:2.5,textTransform:"uppercase",display:"block",marginBottom:7}}>
                  Bio — AI builds your world from this
                </label>
                <textarea className="ob-inp" rows={3} value={form.bio} onChange={e=>handleBioChange(e.target.value)}
                  placeholder="NBA prospect. 6'7 SG. Top 5 recruit. Duke commit. Hoop dreams never die ✊"
                  style={{width:"100%",background:"#080810",border:"1px solid #1a1a1a",borderRadius:10,padding:"13px 16px",color:"#fff",fontSize:14,fontFamily:"inherit",resize:"none",lineHeight:1.55}}/>
                <div style={{minHeight:28,marginTop:4}}>
                  {detectingWorld && (
                    <div style={{color:"#333",fontSize:11,animation:"pulse 1.5s infinite"}}>detecting world...</div>
                  )}
                  {!detectingWorld && detectedWorld && (
                    <div style={{display:"flex",alignItems:"center",gap:6,animation:"fadeIn 0.3s ease"}}>
                      <span style={{color:"#444",fontSize:11}}>Detected:</span>
                      <div style={{
                        display:"inline-flex",alignItems:"center",gap:6,
                        background:"#0a1628",border:"1px solid #1a3a5a",
                        borderRadius:20,padding:"3px 10px",
                      }}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:"#4a8fb5"}}/>
                        <span style={{color:"#4a8fb5",fontSize:11,fontWeight:600}}>{detectedWorld}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <button className="cta" onClick={handleOnboard} disabled={!form.name||!form.handle||!form.bio}
                style={{
                  padding:"15px",background:form.name&&form.handle&&form.bio?"linear-gradient(135deg,#fff,#ddd)":"#0d0d14",
                  color:form.name&&form.handle&&form.bio?"#040408":"#222",border:"none",borderRadius:10,
                  fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Syne',sans-serif",letterSpacing:1,textTransform:"uppercase",
                  animation:"fadeIn .5s .2s ease both",
                }}>Enter the Echo Chamber →</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── FIGURE PICKING ───
  if (screen==="picking") {
    return (
      <div style={{minHeight:"100vh",background:"#040408",fontFamily:"'DM Mono',monospace",display:"flex",justifyContent:"center",padding:20}}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500&family=Syne:wght@700;800;900&display=swap');
          *{box-sizing:border-box;margin:0;padding:0}body{background:#040408}
          ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
          @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
          .fig-card{transition:all .18s;cursor:pointer;border-radius:12px}
          .fig-card:hover{background:#0d0d1a!important}
          .cta{transition:all .22s}.cta:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(255,255,255,0.08)}
        `}</style>
        {generatingFeed?(
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,minHeight:"100vh"}}>
            <div style={{textAlign:"center",color:"#fff"}}>
              <div style={{fontSize:52,marginBottom:18}}>🌐</div>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:900,marginBottom:10}}>Building your world...</div>
              <div style={{color:"#333",fontSize:11,letterSpacing:2,animation:"pulse 1.5s infinite"}}>GENERATING AI PERSONAS & FEED</div>
            </div>
          </div>
        ):(
          <div style={{width:"100%",maxWidth:560,padding:"32px 0"}}>
            <div style={{marginBottom:28,animation:"fadeIn .4s ease"}}>
              <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:900,color:"#fff",marginBottom:8}}>Who's in your world?</div>
              <div style={{color:"#444",fontSize:13,lineHeight:1.6}}>
                Pick real figures from <span style={{color:"#4a8fb5"}}>{worldContext?.industry||"your world"}</span> to interact with.
              </div>
            </div>

            {realWorldCandidates.length === 0 ? (
              <div style={{padding:"28px",textAlign:"center",color:"#444",fontSize:13,border:"1px solid #111",borderRadius:12,marginBottom:24}}>
                <div style={{fontSize:28,marginBottom:10}}>🌐</div>
                <div>Couldn't load real-world figures.</div>
                <div style={{marginTop:4,color:"#333"}}>You can still continue with AI-generated personas.</div>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:24}}>
                {realWorldCandidates.map((fig,i)=>{
                  const picked=pickedFigures.includes(fig.handle);
                  return (
                    <div key={fig.handle} className="fig-card" onClick={()=>togglePickFigure(fig.handle)}
                      style={{
                        padding:"14px",border:`1px solid ${picked?"#1d9bf0":"#111"}`,
                        background:picked?"#0a1628":"#07070d",
                        animation:`fadeIn .3s ${i*.04}s ease both`,position:"relative"
                      }}>
                      {picked&&<div style={{position:"absolute",top:8,right:10,color:"#1d9bf0",fontSize:16}}>✓</div>}
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
                        <Avatar name={fig.name} size={38} color={fig.avatarColor} verified={true}/>
                        <div style={{minWidth:0}}>
                          <div style={{color:"#fff",fontSize:13,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fig.name}</div>
                          <div style={{color:"#444",fontSize:11}}>@{fig.handle}</div>
                        </div>
                      </div>
                      <div style={{color:"#555",fontSize:11,lineHeight:1.5,marginBottom:6}}>{fig.realWorldContext}</div>
                      <span style={{background:"#0a1a0a",color:"#4a8fb5",padding:"2px 7px",borderRadius:4,fontSize:10}}>{fig.type}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 0",borderTop:"1px solid #111"}}>
              <div style={{color:"#444",fontSize:13}}>
                {pickedFigures.length} selected
                {pickedFigures.length>0&&<span style={{color:"#1d9bf0"}}> · they'll appear in your feed</span>}
              </div>
              <button className="cta" onClick={handleFinishPicking} style={{
                padding:"12px 24px",background:"#fff",color:"#040408",border:"none",
                borderRadius:20,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Syne',sans-serif",
              }}>{pickedFigures.length?`Add ${pickedFigures.length} & Enter →`:"Skip & Enter →"}</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── MAIN APP ───
  return (
    <div style={{minHeight:"100vh",background:"#040408",fontFamily:"'DM Mono',monospace",display:"flex",justifyContent:"center"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500&family=Syne:wght@700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{background:#040408}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:2px}
        input,textarea{outline:none;caret-color:#fff}
        @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        .post-card:hover{background:#07070d!important}
        .nav-item{transition:all .15s;border-radius:10px;cursor:pointer}
        .nav-item:hover{background:#0d0d14!important}
        .act-btn{background:none;border:none;padding:0;font-size:12px;display:flex;align-items:center;gap:5px;cursor:pointer;font-family:inherit;transition:all .15s}
        .act-btn:hover{transform:scale(1.1)}
        .post-btn{transition:all .2s}.post-btn:hover:not(:disabled){opacity:.85}
        .notif-badge{animation:pulse 1.5s infinite}
        .mention-row:hover{background:#111!important}
        .world-tag{background:#0a1628;border:1px solid #1a2a3a;border-radius:6px;padding:1px 7px;color:#4a8fb5;font-size:10px}
      `}</style>

      {viewingProfile&&(
        <ProfileModal
          user={viewingProfile}
          isFollowing={following.includes(viewingProfile.handle)}
          onFollow={toggleFollow}
          onClose={()=>setViewingProfile(null)}
          feedPosts={feedPosts}
          allUsers={allMentionableUsers}
          relationship={relationships[viewingProfile.handle]||"neutral"}
          onRelationshipChange={setRelationship}
        />
      )}

      {/* LEFT NAV */}
      <div style={{width:220,padding:"24px 12px",borderRight:"1px solid #0f0f18",display:"flex",flexDirection:"column",gap:2,position:"sticky",top:0,height:"100vh",overflowY:"auto",flexShrink:0}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:26,fontWeight:900,color:"#fff",marginBottom:28,paddingLeft:14,letterSpacing:-1}}>echo.</div>
        {[
          {id:"home",icon:"⌂",label:"Home"},
          {id:"explore",icon:"◎",label:"Explore"},
          {id:"notifications",icon:"◌",label:"Notifications",badge:unreadNotifs},
          {id:"profile",icon:"◈",label:"Profile"},
        ].map(item=>(
          <div key={item.id} className="nav-item"
            onClick={()=>{setActiveTab(item.id);if(item.id==="notifications")setNotifications(prev=>prev.map(n=>({...n,read:true})));}}
            style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",color:activeTab===item.id?"#fff":"#444",fontWeight:activeTab===item.id?600:400,fontSize:14,position:"relative"}}>
            <span style={{fontSize:18}}>{item.icon}</span>{item.label}
            {item.badge>0&&<span className="notif-badge" style={{position:"absolute",right:12,background:"#f91880",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:9,fontWeight:800}}>{item.badge}</span>}
          </div>
        ))}
        {worldContext?.industry&&(
          <div style={{margin:"16px 14px 0",padding:"10px 12px",background:"#0a0a14",borderRadius:8,border:"1px solid #111"}}>
            <div style={{color:"#333",fontSize:9,letterSpacing:2,marginBottom:5}}>YOUR WORLD</div>
            <div style={{color:"#4a8fb5",fontSize:11,fontWeight:600}}>{worldContext.industry}</div>
          </div>
        )}
        <div style={{marginTop:"auto",padding:"14px",borderTop:"1px solid #0f0f18"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Avatar name={profile?.name} size={34} color={profile?.avatarColor}/>
            <div>
              <div style={{color:"#ddd",fontSize:12,fontWeight:600}}>{profile?.name}</div>
              <div style={{color:"#333",fontSize:10}}>@{profile?.handle}</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,maxWidth:600,borderRight:"1px solid #0f0f18",minHeight:"100vh"}}>
        {activeTab==="home"&&(
          <div>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #0f0f18",position:"sticky",top:0,background:"rgba(4,4,8,0.92)",backdropFilter:"blur(12px)",zIndex:10}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:18}}>Home</div>
                {worldContext?.industry&&<span className="world-tag">{worldContext.industry}</span>}
              </div>
            </div>
            <ComposeBox profile={profile} allUsers={allMentionableUsers} onPost={handlePost} posting={posting}/>
            {feedPosts.map(post=>(
              <PostCard key={post.id} post={post}
                isUser={!!post.isUserPost} profile={profile}
                allUsers={allMentionableUsers} relationships={relationships}
                autoSentiments={autoSentiments}
                onLike={()=>setFeedPosts(prev=>prev.map(p=>p.id===post.id?{...p,likedByMe:!p.likedByMe,likes:p.likes+(p.likedByMe?-1:1)}:p))}
                onExpand={()=>setExpandedPost(expandedPost===post.id?null:post.id)}
                expanded={expandedPost===post.id}
                onMentionClick={u=>setViewingProfile(u)}
                onUserReply={handleUserReply}
                onUserReplyToReply={handleUserReplyToReply}
              />
            ))}
          </div>
        )}

        {activeTab==="explore"&&(
          <div>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #0f0f18",position:"sticky",top:0,background:"rgba(4,4,8,0.92)",backdropFilter:"blur(12px)",zIndex:10}}>
              <div style={{color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:18}}>Explore</div>
            </div>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #0f0f18"}}>
              <div style={{color:"#333",fontSize:10,letterSpacing:2,marginBottom:14}}>TRENDING IN YOUR WORLD</div>
              {worldContext?.topics?.map((topic,i)=>(
                <div key={i} style={{padding:"12px 0",borderBottom:"1px solid #0d0d14"}}>
                  <div style={{color:"#fff",fontSize:13,fontWeight:600}}>#{topic.replace(/\s+/g,"")}</div>
                  <div style={{color:"#333",fontSize:11,marginTop:3}}>{randInt(5,200)}K posts</div>
                </div>
              ))}
            </div>
            <div style={{padding:"16px 20px"}}>
              <div style={{color:"#333",fontSize:10,letterSpacing:2,marginBottom:14}}>PEOPLE IN YOUR WORLD</div>
              {aiUsers.map((u,i)=>(
                <div key={u.handle} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid #0d0d14",cursor:"pointer",animation:`fadeIn .3s ${i*.04}s both`}}
                  onClick={()=>setViewingProfile(u)}>
                  <Avatar name={u.name} size={40} color={u.avatarColor} verified={u.verified}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{color:"#fff",fontSize:13,fontWeight:600}}>{u.name}</span>
                      {u.isRealWorld&&<span style={{color:"#f0a500",fontSize:10}}>⭐</span>}
                    </div>
                    <div style={{color:"#444",fontSize:11}}>@{u.handle} · {u.type}</div>
                    {u.bio&&<div style={{color:"#333",fontSize:11,marginTop:2}}>{u.bio}</div>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
                    <div style={{color:"#333",fontSize:10}}>{formatNum(u.followers||0)}</div>
                    <button onClick={e=>{e.stopPropagation();toggleFollow(u.handle);}} style={{
                      padding:"4px 12px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'Syne',sans-serif",
                      background:following.includes(u.handle)?"transparent":"#fff",
                      color:following.includes(u.handle)?"#666":"#040408",
                      border:following.includes(u.handle)?"1px solid #333":"none",
                    }}>{following.includes(u.handle)?"Following":"Follow"}</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab==="notifications"&&(
          <div>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #0f0f18",position:"sticky",top:0,background:"rgba(4,4,8,0.92)",backdropFilter:"blur(12px)",zIndex:10}}>
              <div style={{color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:18}}>Notifications</div>
            </div>
            {notifications.length===0?(
              <div style={{padding:40,textAlign:"center",color:"#222",fontSize:13}}>Post something to get reactions</div>
            ):notifications.map((n,i)=>(
              <div key={n.id} style={{padding:"14px 20px",borderBottom:"1px solid #0d0d14",display:"flex",gap:12,cursor:"pointer",animation:`fadeIn .3s ${i*.04}s both`,background:n.read?"transparent":"#07070f"}}
                onClick={()=>setViewingProfile(n.from)}>
                <Avatar name={n.from?.name} size={36} verified={n.from?.verified}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{color:"#ddd",fontSize:13,fontWeight:600}}>{n.from?.name}</span>
                    <span style={{color:"#333",fontSize:11}}>@{n.from?.handle}</span>
                    <span style={{color:"#222",fontSize:11}}>· {n.time}</span>
                    <span style={{color:n.type==="mention"?"#1d9bf0":"#888",fontSize:10}}>{n.type==="mention"?"mentioned you":"replied"}</span>
                  </div>
                  <div style={{color:"#555",fontSize:13,lineHeight:1.5}}>{n.preview}</div>
                </div>
                {!n.read&&<div style={{width:6,height:6,borderRadius:"50%",background:"#f91880",flexShrink:0,marginTop:6}}/>}
              </div>
            ))}
          </div>
        )}

        {activeTab==="profile"&&(
          <div>
            <div style={{padding:"16px 20px",borderBottom:"1px solid #0f0f18",position:"sticky",top:0,background:"rgba(4,4,8,0.92)",backdropFilter:"blur(12px)",zIndex:10}}>
              <div style={{color:"#fff",fontFamily:"'Syne',sans-serif",fontWeight:900,fontSize:18}}>Profile</div>
            </div>
            <div style={{height:80,background:`linear-gradient(135deg,${profile?.avatarColor||"#1a1a2e"}33,#040408)`}}/>
            <div style={{padding:"0 20px 20px",borderBottom:"1px solid #111"}}>
              <div style={{marginTop:-28,marginBottom:14}}><Avatar name={profile?.name} size={68} color={profile?.avatarColor}/></div>
              <div style={{color:"#fff",fontSize:18,fontWeight:700}}>{profile?.name}</div>
              <div style={{color:"#444",fontSize:13,marginBottom:8}}>@{profile?.handle}</div>
              <div style={{color:"#888",fontSize:13,lineHeight:1.55,marginBottom:12}}>{profile?.bio}</div>
              {worldContext?.industry&&<span className="world-tag">{worldContext.industry}</span>}
              <div style={{display:"flex",gap:24,marginTop:14}}>
                <div><b style={{color:"#fff",fontSize:14}}>{formatNum(following.length+randInt(80,300))}</b><span style={{color:"#444",fontSize:12}}> following</span></div>
                <div><b style={{color:"#fff",fontSize:14}}>{formatNum(followers)}</b><span style={{color:"#444",fontSize:12}}> followers</span></div>
                <div><b style={{color:"#fff",fontSize:14}}>{feedPosts.filter(p=>p.isUserPost).length}</b><span style={{color:"#444",fontSize:12}}> posts</span></div>
              </div>
            </div>
            {Object.entries(relationships).filter(([,v])=>v&&v!=="neutral").length>0&&(
              <div style={{padding:"14px 20px",borderBottom:"1px solid #111"}}>
                <div style={{color:"#333",fontSize:10,letterSpacing:2,marginBottom:12}}>YOUR DYNAMICS</div>
                {Object.entries(relationships).filter(([,v])=>v&&v!=="neutral").map(([handle,rel])=>{
                  const u=aiUsers.find(a=>a.handle===handle);
                  if(!u)return null;
                  return(
                    <div key={handle} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,cursor:"pointer"}} onClick={()=>setViewingProfile(u)}>
                      <Avatar name={u.name} size={32} color={u.avatarColor} verified={u.verified}/>
                      <div style={{flex:1}}>
                        <span style={{color:"#bbb",fontSize:13,fontWeight:600}}>{u.name}</span>
                        <span style={{color:rel==="support"?"#00ba7c":"#f91880",fontSize:11,marginLeft:8}}>
                          {rel==="support"?"✊ Supporting":"🔥 Beefing"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {feedPosts.filter(p=>p.isUserPost).length>0&&(
              <div>
                <div style={{padding:"12px 20px",borderBottom:"1px solid #0f0f18"}}>
                  <div style={{color:"#333",fontSize:10,letterSpacing:2}}>YOUR POSTS</div>
                </div>
                {feedPosts.filter(p=>p.isUserPost).map(post=>(
                  <PostCard key={post.id} post={post} isUser={true} profile={profile}
                    allUsers={allMentionableUsers} relationships={relationships}
                    autoSentiments={autoSentiments}
                    onLike={()=>setFeedPosts(prev=>prev.map(p=>p.id===post.id?{...p,likedByMe:!p.likedByMe,likes:p.likes+(p.likedByMe?-1:1)}:p))}
                    onExpand={()=>setExpandedPost(expandedPost===post.id?null:post.id)}
                    expanded={expandedPost===post.id}
                    onMentionClick={u=>setViewingProfile(u)}
                    onUserReply={handleUserReply}
                    onUserReplyToReply={handleUserReplyToReply}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{width:260,padding:"24px 16px",display:"flex",flexDirection:"column",gap:16,position:"sticky",top:0,height:"100vh",overflowY:"auto",flexShrink:0}}>
        {aiUsers.filter(u=>u.isRealWorld).length>0&&(
          <div style={{background:"#07070d",borderRadius:12,padding:16,border:"1px solid #0f0f18"}}>
            <div style={{color:"#f0a500",fontSize:9,letterSpacing:2,marginBottom:12}}>⭐ REAL WORLD</div>
            {aiUsers.filter(u=>u.isRealWorld).slice(0,5).map(u=>(
              <div key={u.handle} style={{display:"flex",gap:10,alignItems:"center",marginBottom:11,cursor:"pointer"}} onClick={()=>setViewingProfile(u)}>
                <Avatar name={u.name} size={32} color={u.avatarColor} verified={true}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:"#bbb",fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.name}</div>
                  <div style={{
                    color:relationships[u.handle]==="support"?"#00ba7c":relationships[u.handle]==="beef"?"#f91880":"#333",
                    fontSize:10
                  }}>{relationships[u.handle]==="support"?"✊ supporting":relationships[u.handle]==="beef"?"🔥 beefing":`@${u.handle}`}</div>
                </div>
                <button onClick={e=>{e.stopPropagation();toggleFollow(u.handle);}} style={{
                  padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"'Syne',sans-serif",
                  background:following.includes(u.handle)?"transparent":"#ffffff18",
                  color:following.includes(u.handle)?"#555":"#aaa",
                  border:following.includes(u.handle)?"1px solid #222":"1px solid #333",
                }}>{following.includes(u.handle)?"✓":"+"}</button>
              </div>
            ))}
          </div>
        )}
        <div style={{background:"#07070d",borderRadius:12,padding:16,border:"1px solid #0f0f18"}}>
          <div style={{color:"#444",fontSize:9,letterSpacing:2,marginBottom:10}}>LIVE FEED</div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"#00ba7c",animation:"pulse 2s infinite"}}/>
            <span style={{color:"#333",fontSize:11}}>Posts rolling in every ~20s</span>
          </div>
          <div style={{color:"#222",fontSize:10,lineHeight:1.7}}>
            {feedPosts.slice(0,3).map(p=>(
              <div key={p.id} style={{marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#2a2a3a"}}>
                @{p.author?.handle}: {p.content?.slice(0,40)}...
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}