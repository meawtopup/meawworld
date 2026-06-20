// ==UserScript==
// @name         MeawWorld UI
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  MeawWorld UI Components
// @author       Meaw
// @match        https://www.torrentdd.com/chat.php
// @match        https://www.torrentdd.net/chat.php
// @grant        GM_addStyle
// ==/UserScript==
// sctipts/shared/meawworld-ui.user.js

(function() {
    'use strict';
    
    window.MeawWorld = window.MeawWorld || {};
    const MW = window.MeawWorld;
    
    MW.UI = {
        sidebar: null, isOpen: false, currentPage: 'home',
        
        async init() {
            this.injectStyles();
            this.createSidebar();
            await this.showHomePage();
            this.toggle();
        },
        
        injectStyles() {
            GM_addStyle(`
                :root { --mw-bg: #1a1a2e; --mw-card: #16213e; --mw-accent: #e94560; --mw-gold: #ffd700; --mw-green: #00ff88; --mw-red: #ff4444; --mw-text: #eee; --mw-text-dim: #888; --mw-border: #0f3460; }
                #meawworld-sidebar { position:fixed; right:0; top:0; width:400px; height:100vh; background:var(--mw-bg); color:var(--mw-text); z-index:9999; transform:translateX(100%); transition:transform 0.3s; font-family:sans-serif; box-shadow:-5px 0 20px rgba(0,0,0,0.5); display:flex; flex-direction:column; }
                #meawworld-sidebar.open { transform:translateX(0); }
                #meawworld-toggle { position:fixed; right:10px; top:10px; z-index:10000; background:var(--mw-card); color:var(--mw-text); border:2px solid var(--mw-border); padding:10px 15px; cursor:pointer; border-radius:8px; }
                #meawworld-toggle:hover { background:var(--mw-accent); }
                .mw-header { background:linear-gradient(135deg,var(--mw-card),var(--mw-border)); padding:20px; border-bottom:2px solid var(--mw-accent); }
                .mw-header h2 { margin:0; font-size:24px; color:var(--mw-gold); }
                .mw-user-info { background:var(--mw-card); padding:15px; margin:10px; border-radius:10px; display:flex; justify-content:space-between; align-items:center; }
                .mw-username { color:var(--mw-accent); font-weight:bold; }
                .mw-coin { color:var(--mw-gold); font-weight:bold; font-size:18px; }
                .mw-content { flex:1; overflow-y:auto; padding:10px; }
                .mw-footer { background:var(--mw-card); padding:10px; text-align:center; font-size:12px; color:var(--mw-text-dim); border-top:1px solid var(--mw-border); }
                .mw-btn { display:block; width:100%; padding:12px; margin:8px 0; border:none; border-radius:8px; font-size:16px; cursor:pointer; font-weight:bold; }
                .mw-btn-primary { background:var(--mw-accent); color:white; }
                .mw-btn-secondary { background:var(--mw-card); color:var(--mw-text); border:1px solid var(--mw-border); }
                .mw-btn-danger { background:var(--mw-red); color:white; }
                .mw-card { background:var(--mw-card); border-radius:10px; padding:15px; margin:10px 0; border:1px solid var(--mw-border); }
                .mw-game-item { background:var(--mw-card); border:2px solid var(--mw-border); border-radius:10px; padding:15px; cursor:pointer; margin:5px 0; }
                .mw-game-item:hover { border-color:var(--mw-accent); }
                .mw-status-badge { display:inline-block; padding:3px 10px; border-radius:15px; font-size:12px; }
                .mw-status-waiting { background:#ffd70033; color:var(--mw-gold); }
                .mw-status-playing { background:#00ff8833; color:var(--mw-green); }
                .mw-text-center { text-align:center; }
                .mw-text-small { font-size:12px; color:var(--mw-text-dim); }
                .mw-flex-between { display:flex; justify-content:space-between; align-items:center; }
                .mw-mt-10 { margin-top:10px; } .mw-mt-20 { margin-top:20px; } .mw-mb-10 { margin-bottom:10px; }
            `);
        },
        
        createSidebar() {
            const toggle = document.createElement('button');
            toggle.id = 'meawworld-toggle';
            toggle.innerHTML = '🎮 MeawWorld';
            toggle.onclick = () => this.toggle();
            document.body.appendChild(toggle);
            
            this.sidebar = document.createElement('div');
            this.sidebar.id = 'meawworld-sidebar';
            this.sidebar.innerHTML = `<div class="mw-header"><h2>🐱 MeawWorld</h2><p class="mw-text-small">Card Game System v1.0</p></div><div class="mw-content" id="mw-content"></div><div class="mw-footer">Create by Meaw. v1.0.1</div>`;
            document.body.appendChild(this.sidebar);
        },
        
        toggle() { this.isOpen = !this.isOpen; this.sidebar.classList.toggle('open'); },
        
        async showHomePage() {
            this.currentPage = 'home';
            const content = document.getElementById('mw-content');
            if (!MW.DB.currentUser) {
                content.innerHTML = '<div class="mw-text-center mw-mt-20"><h3>🔄 กำลังโหลด...</h3></div>';
                return;
            }
            const user = MW.DB.currentUser;
            const games = await MW.DB.getOpenGames();
            let gameHTML = games.length === 0 
                ? '<div class="mw-text-center mw-mt-20"><p>🎰 ยังไม่มีโต๊ะเปิด</p></div>'
                : games.map(g => `<div class="mw-game-item" onclick="MeawWorld.UI.joinGame('${g.id}')"><div class="mw-flex-between"><strong>${g.room_name||'ห้อง '+g.room_number}</strong><span class="mw-text-small">${g.current_player_count}/${g.max_players}</span></div></div>`).join('');
            
            content.innerHTML = `
                <div class="mw-user-info"><div><div class="mw-username">👤 ${user.username}</div><div class="mw-text-small">UID: ${user.uid}</div></div><div class="mw-coin">💰 ${MW.Utils.formatNumber(user.coin)}</div></div>
                <div class="mw-card"><h3>🎰 โต๊ะที่เปิด</h3>${gameHTML}</div>
                <button class="mw-btn mw-btn-primary" onclick="MeawWorld.UI.refreshPage()">🔄 รีเฟรช</button>`;
        },
        
        async showGamePage(gameId) {
            this.currentPage = 'game';
            const content = document.getElementById('mw-content');
            const user = MW.DB.currentUser;
            if (!user) return;
            const game = await MW.DB.getGame(gameId);
            const players = await MW.DB.getGamePlayers(gameId);
            const myCards = await MW.DB.getMyCards(gameId, user.uid);
            let playersHTML = players.map(p => `<div class="mw-flex-between mw-mb-10"><span>🪑 ${p.player?.username||'ผู้เล่น'}</span></div>`).join('');
            content.innerHTML = `
                <button class="mw-btn mw-btn-secondary mw-mb-10" onclick="MeawWorld.UI.showHomePage()">← กลับ</button>
                <div class="mw-card"><h3>🎲 ${game.room_name||'ห้อง '+game.room_number}</h3><p>ผู้เล่น ${game.current_player_count}/${game.max_players}</p></div>
                <div class="mw-card"><h3>🃏 ไพ่ของคุณ</h3>${myCards ? '<p>แต้ม: '+myCards.card_score+'</p>' : '<p>รอแจกไพ่...</p>'}</div>
                <div class="mw-card"><h3>👥 ผู้เล่น</h3>${playersHTML}</div>
                <button class="mw-btn mw-btn-danger" onclick="MeawWorld.UI.leaveGame('${gameId}')">🚪 ออก</button>`;
        },
        
        joinGame(gameId) { alert('ระบบเข้าร่วมเกมกำลังพัฒนา'); },
        leaveGame(gameId) { if(confirm('ออกจากโต๊ะ?')) this.showHomePage(); },
        async refreshPage() { if(this.currentPage==='home') await this.showHomePage(); }
    };
})();