// ==UserScript==
// @name         MeawWorld Core
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  MeawWorld Card Game Core System
// @author       Meaw
// @match        https://www.torrentdd.com/chat.php
// @match        https://www.torrentdd.net/chat.php
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
// ==/UserScript==
// sctipts/shared/meawworld-core.user.js

(function() {
    'use strict';
    
    const CONFIG = {
        SUPABASE_URL: 'https://okambqmnvgflewnnvjet.supabase.co',
        SUPABASE_KEY: 'sb_publishable_JNXb71sQOmTMUY_HCTGiaQ_Fj8Q4j2d',
        GAME: {
            INITIAL_COIN: 5000,
            MIN_BET: 10,
            MAX_BET: 1000,
            HOST_UID: '1',
            HOST_NAME: 'meaw_dealer1'
        }
    };
    
    window.MeawWorld = window.MeawWorld || {};
    const MW = window.MeawWorld;
    
    MW.DB = {
        supabase: null,
        currentUser: null,
        
        init() {
            this.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            console.log('✅ MeawWorld: Supabase Connected');
        },
        
        async getUser(uid) {
            const { data, error } = await this.supabase
                .from('users').select('*').eq('uid', uid).single();
            if (error && error.code !== 'PGRST116') console.error('Get user error:', error);
            return data;
        },
        
        async createUser(uid, username) {
            const { data, error } = await this.supabase
                .from('users').insert([{
                    uid: uid, username: username,
                    coin: CONFIG.GAME.INITIAL_COIN, role: 'player'
                }]).select().single();
            if (error) { console.error('Create user error:', error); return null; }
            await this.logTransaction(uid, 'initial_bonus', CONFIG.GAME.INITIAL_COIN, 0, CONFIG.GAME.INITIAL_COIN);
            return data;
        },
        
        async updateLastLogin(uid) {
            await this.supabase.from('users').update({ last_login: new Date() }).eq('uid', uid);
        },
        
        async getOpenGames() {
            const { data } = await this.supabase.from('game_sessions')
                .select('*, host:users!game_sessions_host_uid_fkey(username)')
                .in('status', ['waiting', 'playing']).order('created_at', { ascending: false });
            return data || [];
        },
        
        async getGame(gameId) {
            const { data } = await this.supabase.from('game_sessions').select('*').eq('id', gameId).single();
            return data;
        },
        
        async getGamePlayers(gameId) {
            const { data } = await this.supabase.from('game_players')
                .select('*, player:users!game_players_player_uid_fkey(username)').eq('game_id', gameId);
            return data || [];
        },
        
        async getMyCards(gameId, uid) {
            const { data } = await this.supabase.from('game_players')
                .select('cards, card_score, status').eq('game_id', gameId).eq('player_uid', uid).single();
            return data;
        },
        
        async logTransaction(userId, type, amount, balanceBefore, balanceAfter, gameId = null, description = '') {
            await this.supabase.from('transaction_logs').insert([{
                user_id: userId, type, amount,
                balance_before: balanceBefore, balance_after: balanceAfter,
                game_id: gameId, description
            }]);
        },
        
        subscribeToGame(gameId, callback) {
            return this.supabase.channel(`game_${gameId}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` }, (p) => callback('players', p))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${gameId}` }, (p) => callback('session', p))
                .subscribe();
        },
        
        subscribeToMyCards(gameId, uid, callback) {
            return this.supabase.channel(`my_cards_${gameId}_${uid}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` }, (payload) => {
                    if (payload.new.player_uid === uid) callback(payload.new);
                }).subscribe();
        }
    };
    
    MW.Auth = {
        async init() {
            try {
                const userData = await this.fetchProfile();
                if (!userData) { console.error('❌ Cannot fetch profile'); return null; }
                let dbUser = await MW.DB.getUser(userData.uid);
                if (!dbUser) {
                    dbUser = await MW.DB.createUser(userData.uid, userData.username);
                    console.log('🎉 New user:', dbUser);
                } else {
                    await MW.DB.updateLastLogin(userData.uid);
                    console.log('👋 Welcome back:', dbUser);
                }
                MW.DB.currentUser = dbUser;
                return dbUser;
            } catch (error) { console.error('Auth error:', error); return null; }
        },
        
        fetchProfile() {
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET', url: 'https://www.torrentdd.com/profile.php',
                    onload: function(r) {
                        const doc = new DOMParser().parseFromString(r.responseText, 'text/html');
                        const el = doc.querySelector('.fw400.text-center a.text-worldpro');
                        if (el) {
                            resolve({ username: el.textContent.trim(), uid: el.getAttribute('href').split('id=')[1] });
                        } else resolve(null);
                    },
                    onerror: () => resolve(null)
                });
            });
        }
    };
    
    MW.Utils = {
        formatNumber(num) { return num.toLocaleString(); },
        sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    };
    
    MW.init = async function() {
        console.log('🐱 MeawWorld Core Initializing...');
        MW.DB.init();
        await MW.Utils.sleep(100);
        if (typeof MW.UI !== 'undefined') await MW.UI.init();
    };
    
    MW.init();
})();