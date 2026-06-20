// ==UserScript==
// @name         MeawWorld UI
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  MeawWorld UI Components
// @author       Meaw
// @match        https://www.torrentdd.com/chat.php
// @match        https://www.torrentdd.net/chat.php
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
// ==/UserScript==
// meawworld-ui.user.js

(function() {
    'use strict';
    
    window.MeawWorld = window.MeawWorld || {};
    const MW = window.MeawWorld;
    
    // ==========================================
    // UI SYSTEM
    // ==========================================
    MW.UI = {
        sidebar: null,
        isOpen: false,
        currentPage: 'home',
        
        async init() {
            this.injectStyles();
            this.createSidebar();
            await this.showHomePage();
            this.toggle(); // เปิด sidebar อัตโนมัติ
        },
        
        // ==========================================
        // STYLES
        // ==========================================
        injectStyles() {
            GM_addStyle(`
                :root {
                    --mw-bg: #1a1a2e;
                    --mw-card: #16213e;
                    --mw-accent: #e94560;
                    --mw-gold: #ffd700;
                    --mw-green: #00ff88;
                    --mw-red: #ff4444;
                    --mw-text: #eee;
                    --mw-text-dim: #888;
                    --mw-border: #0f3460;
                }
                
                #meawworld-sidebar {
                    position: fixed;
                    right: 0;
                    top: 0;
                    width: 400px;
                    height: 100vh;
                    background: var(--mw-bg);
                    color: var(--mw-text);
                    z-index: 9999;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                    font-family: 'Kanit', 'Arial', sans-serif;
                    box-shadow: -5px 0 20px rgba(0,0,0,0.5);
                    display: flex;
                    flex-direction: column;
                }
                
                #meawworld-sidebar.open {
                    transform: translateX(0);
                }
                
                #meawworld-toggle {
                    position: fixed;
                    right: 10px;
                    top: 10px;
                    z-index: 10000;
                    background: var(--mw-card);
                    color: var(--mw-text);
                    border: 2px solid var(--mw-border);
                    padding: 10px 15px;
                    cursor: pointer;
                    border-radius: 8px;
                    font-size: 14px;
                    transition: all 0.3s;
                }
                
                #meawworld-toggle:hover {
                    background: var(--mw-accent);
                    border-color: var(--mw-accent);
                }
                
                .mw-header {
                    background: linear-gradient(135deg, var(--mw-card), var(--mw-border));
                    padding: 20px;
                    border-bottom: 2px solid var(--mw-accent);
                }
                
                .mw-header h2 {
                    margin: 0;
                    font-size: 24px;
                    color: var(--mw-gold);
                }
                
                .mw-user-info {
                    background: var(--mw-card);
                    padding: 15px;
                    margin: 10px;
                    border-radius: 10px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .mw-username {
                    color: var(--mw-accent);
                    font-weight: bold;
                }
                
                .mw-coin {
                    color: var(--mw-gold);
                    font-weight: bold;
                    font-size: 18px;
                }
                
                .mw-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 10px;
                }
                
                .mw-footer {
                    background: var(--mw-card);
                    padding: 10px;
                    text-align: center;
                    font-size: 12px;
                    color: var(--mw-text-dim);
                    border-top: 1px solid var(--mw-border);
                }
                
                .mw-btn {
                    display: block;
                    width: 100%;
                    padding: 12px;
                    margin: 8px 0;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: all 0.3s;
                    font-weight: bold;
                }
                
                .mw-btn-primary {
                    background: var(--mw-accent);
                    color: white;
                }
                
                .mw-btn-primary:hover {
                    background: #ff6b81;
                    transform: scale(1.02);
                }
                
                .mw-btn-secondary {
                    background: var(--mw-card);
                    color: var(--mw-text);
                    border: 1px solid var(--mw-border);
                }
                
                .mw-btn-secondary:hover {
                    background: var(--mw-border);
                }
                
                .mw-btn-success {
                    background: var(--mw-green);
                    color: var(--mw-bg);
                }
                
                .mw-btn-danger {
                    background: var(--mw-red);
                    color: white;
                }
                
                .mw-card {
                    background: var(--mw-card);
                    border-radius: 10px;
                    padding: 15px;
                    margin: 10px 0;
                    border: 1px solid var(--mw-border);
                }
                
                .mw-game-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                
                .mw-game-item {
                    background: var(--mw-card);
                    border: 2px solid var(--mw-border);
                    border-radius: 10px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                
                .mw-game-item:hover {
                    border-color: var(--mw-accent);
                    transform: translateX(-5px);
                }
                
                .mw-cards-display {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin: 15px 0;
                }
                
                .mw-card-item {
                    background: white;
                    color: black;
                    width: 60px;
                    height: 90px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    font-weight: bold;
                    box-shadow: 2px 2px 10px rgba(0,0,0,0.3);
                }
                
                .mw-card-red {
                    color: var(--mw-red);
                }
                
                .mw-card-black {
                    color: black;
                }
                
                .mw-status-badge {
                    display: inline-block;
                    padding: 3px 10px;
                    border-radius: 15px;
                    font-size: 12px;
                    font-weight: bold;
                }
                
                .mw-status-waiting {
                    background: #ffd70033;
                    color: var(--mw-gold);
                }
                
                .mw-status-playing {
                    background: #00ff8833;
                    color: var(--mw-green);
                }
                
                .mw-status-finished {
                    background: #ff444433;
                    color: var(--mw-red);
                }
                
                .mw-input {
                    width: 100%;
                    padding: 10px;
                    background: var(--mw-bg);
                    border: 1px solid var(--mw-border);
                    border-radius: 5px;
                    color: var(--mw-text);
                    font-size: 16px;
                    box-sizing: border-box;
                }
                
                .mw-input:focus {
                    outline: none;
                    border-color: var(--mw-accent);
                }
                
                .mw-text-center {
                    text-align: center;
                }
                
                .mw-text-small {
                    font-size: 12px;
                    color: var(--mw-text-dim);
                }
                
                .mw-flex-between {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .mw-mt-10 { margin-top: 10px; }
                .mw-mt-20 { margin-top: 20px; }
                .mw-mb-10 { margin-bottom: 10px; }
            `);
        },
        
        // ==========================================
        // SIDEBAR
        // ==========================================
        createSidebar() {
            // Toggle Button
            const toggle = document.createElement('button');
            toggle.id = 'meawworld-toggle';
            toggle.innerHTML = '🎮 MeawWorld';
            toggle.onclick = () => this.toggle();
            document.body.appendChild(toggle);
            
            // Sidebar
            const sidebar = document.createElement('div');
            sidebar.id = 'meawworld-sidebar';
            sidebar.innerHTML = `
                <div class="mw-header">
                    <h2>🐱 MeawWorld</h2>
                    <p class="mw-text-small">Card Game System v1.0</p>
                </div>
                <div class="mw-content" id="mw-content"></div>
                <div class="mw-footer">
                    Create by Meaw. v1.0.1
                </div>
            `;
            document.body.appendChild(sidebar);
            
            this.sidebar = sidebar;
        },
        
        toggle() {
            this.isOpen = !this.isOpen;
            this.sidebar.classList.toggle('open');
        },
        
        // ==========================================
        // PAGES
        // ==========================================
        async showHomePage() {
            this.currentPage = 'home';
            const content = document.getElementById('mw-content');
            
            // Check if user is logged in
            if (!MW.DB.currentUser) {
                content.innerHTML = `
                    <div class="mw-text-center mw-mt-20">
                        <h3>🔄 กำลังโหลดข้อมูล...</h3>
                        <p class="mw-text-small">กำลังเชื่อมต่อกับระบบ</p>
                    </div>
                `;
                return;
            }
            
            const user = MW.DB.currentUser;
            const games = await MW.DB.getOpenGames();
            
            let gameListHTML = '';
            if (games.length === 0) {
                gameListHTML = `
                    <div class="mw-text-center mw-mt-20">
                        <p>🎰 ยังไม่มีโต๊ะเปิด</p>
                        <p class="mw-text-small">รอเจ้ามือเปิดโต๊ะ หรือเปิดโต๊ะเอง</p>
                    </div>
                `;
            } else {
                gameListHTML = games.map(game => `
                    <div class="mw-game-item" onclick="MeawWorld.UI.joinGame('${game.id}')">
                        <div class="mw-flex-between">
                            <div>
                                <strong>${game.room_name || 'ห้องที่ ' + game.room_number}</strong>
                                <span class="mw-status-badge mw-status-${game.status}">${game.status === 'waiting' ? 'รอผู้เล่น' : 'กำลังเล่น'}</span>
                            </div>
                            <div class="mw-text-small">
                                ${game.current_player_count}/${game.max_players} คน
                            </div>
                        </div>
                        <div class="mw-text-small mw-mt-10">
                            🎲 ${game.game_type} | 💰 เดิมพัน ${game.bet_min}-${game.bet_max}
                        </div>
                    </div>
                `).join('');
            }
            
            content.innerHTML = `
                <div class="mw-user-info">
                    <div>
                        <div class="mw-username">👤 ${user.username}</div>
                        <div class="mw-text-small">UID: ${user.uid}</div>
                    </div>
                    <div class="mw-coin">💰 ${MW.Utils.formatNumber(user.coin)}</div>
                </div>
                
                <div class="mw-card">
                    <h3>🎰 โต๊ะที่เปิดอยู่</h3>
                    <div class="mw-game-list">
                        ${gameListHTML}
                    </div>
                </div>
                
                <button class="mw-btn mw-btn-primary" onclick="MeawWorld.UI.refreshPage()">
                    🔄 รีเฟรช
                </button>
            `;
        },
        
        async showGamePage(gameId) {
            this.currentPage = 'game';
            const content = document.getElementById('mw-content');
            const user = MW.DB.currentUser;
            
            if (!user) return;
            
            const game = await MW.DB.getGame(gameId);
            const players = await MW.DB.getGamePlayers(gameId);
            const myCards = await MW.DB.getMyCards(gameId, user.uid);
            
            let playersHTML = players.map(p => `
                <div class="mw-flex-between mw-mb-10">
                    <span>🪑 ${p.player?.username || 'ผู้เล่น'} (ตำแหน่ง ${p.position})</span>
                    <span class="mw-status-badge mw-status-${p.status === 'playing' ? 'playing' : 'waiting'}">
                        ${p.status}
                    </span>
                </div>
            `).join('');
            
            let cardsHTML = '';
            if (myCards && myCards.cards.length > 0) {
                cardsHTML = `
                    <div class="mw-cards-display">
                        ${myCards.cards.map(card => {
                            const isRed = ['♥','♦'].includes(card.suit);
                            return `<div class="mw-card-item ${isRed ? 'mw-card-red' : 'mw-card-black'}">${card.value}${card.suit}</div>`;
                        }).join('')}
                    </div>
                    <div class="mw-text-center">
                        <h3>แต้ม: ${myCards.card_score}</h3>
                    </div>
                `;
            }
            
            content.innerHTML = `
                <button class="mw-btn mw-btn-secondary mw-mb-10" onclick="MeawWorld.UI.showHomePage()">
                    ← กลับหน้าแรก
                </button>
                
                <div class="mw-card">
                    <h3>🎲 ${game.room_name || 'ห้องที่ ' + game.room_number}</h3>
                    <p>${game.game_type} | ผู้เล่น ${game.current_player_count}/${game.max_players}</p>
                </div>
                
                <div class="mw-card">
                    <h3>🃏 ไพ่ของคุณ</h3>
                    ${cardsHTML || '<p class="mw-text-center">รอการแจกไพ่...</p>'}
                </div>
                
                <div class="mw-card">
                    <h3>👥 ผู้เล่นในโต๊ะ</h3>
                    ${playersHTML}
                </div>
                
                <button class="mw-btn mw-btn-danger" onclick="MeawWorld.UI.leaveGame('${gameId}')">
                    🚪 ออกจากโต๊ะ
                </button>
            `;
        },
        
        // ==========================================
        // ACTIONS
        // ==========================================
        async joinGame(gameId) {
            // TODO: Implement join game logic
            alert('ระบบเข้าร่วมเกมกำลังพัฒนา');
        },
        
        async leaveGame(gameId) {
            if (confirm('ต้องการออกจากโต๊ะนี้?')) {
                this.showHomePage();
            }
        },
        
        async refreshPage() {
            if (this.currentPage === 'home') {
                await this.showHomePage();
            }
        }
    };
    
})();