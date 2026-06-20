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
// meawworld-core.user.js

(function() {
    'use strict';
    
    // ==========================================
    // CONFIGURATION
    // ==========================================
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
    
    // ==========================================
    // NAMESPACE
    // ==========================================
    window.MeawWorld = window.MeawWorld || {};
    const MW = window.MeawWorld;
    
    // ==========================================
    // SUPABASE CONNECTION
    // ==========================================
    MW.DB = {
        supabase: null,
        currentUser: null,
        
        init() {
            this.supabase = supabase.createClient(
                CONFIG.SUPABASE_URL, 
                CONFIG.SUPABASE_KEY
            );
            console.log('✅ MeawWorld: Supabase Connected');
        },
        
        // Users
        async getUser(uid) {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('uid', uid)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                console.error('Get user error:', error);
            }
            return data;
        },
        
        async createUser(uid, username) {
            const { data, error } = await this.supabase
                .from('users')
                .insert([{
                    uid: uid,
                    username: username,
                    coin: CONFIG.GAME.INITIAL_COIN,
                    role: 'player'
                }])
                .select()
                .single();
            
            if (error) {
                console.error('Create user error:', error);
                return null;
            }
            
            // Log transaction
            await this.logTransaction(uid, 'initial_bonus', CONFIG.GAME.INITIAL_COIN, 0, CONFIG.GAME.INITIAL_COIN);
            
            return data;
        },
        
        async updateLastLogin(uid) {
            await this.supabase
                .from('users')
                .update({ last_login: new Date() })
                .eq('uid', uid);
        },
        
        // Game Sessions
        async getOpenGames() {
            const { data, error } = await this.supabase
                .from('game_sessions')
                .select(`
                    *,
                    host:users!game_sessions_host_uid_fkey(username)
                `)
                .in('status', ['waiting', 'playing'])
                .order('created_at', { ascending: false });
            
            return data || [];
        },
        
        async getGame(gameId) {
            const { data } = await this.supabase
                .from('game_sessions')
                .select('*')
                .eq('id', gameId)
                .single();
            
            return data;
        },
        
        // Game Players
        async getGamePlayers(gameId) {
            const { data } = await this.supabase
                .from('game_players')
                .select(`
                    *,
                    player:users!game_players_player_uid_fkey(username)
                `)
                .eq('game_id', gameId);
            
            return data || [];
        },
        
        async getMyCards(gameId, uid) {
            const { data } = await this.supabase
                .from('game_players')
                .select('cards, card_score, status')
                .eq('game_id', gameId)
                .eq('player_uid', uid)
                .single();
            
            return data;
        },
        
        // Transaction Logs
        async logTransaction(userId, type, amount, balanceBefore, balanceAfter, gameId = null, description = '') {
            await this.supabase
                .from('transaction_logs')
                .insert([{
                    user_id: userId,
                    type: type,
                    amount: amount,
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    game_id: gameId,
                    description: description
                }]);
        },
        
        // Realtime Subscriptions
        subscribeToGame(gameId, callback) {
            return this.supabase
                .channel(`game_${gameId}`)
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
                    (payload) => callback('players', payload)
                )
                .on('postgres_changes',
                    { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${gameId}` },
                    (payload) => callback('session', payload)
                )
                .subscribe();
        },
        
        subscribeToMyCards(gameId, uid, callback) {
            return this.supabase
                .channel(`my_cards_${gameId}_${uid}`)
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
                    (payload) => {
                        if (payload.new.player_uid === uid) {
                            callback(payload.new);
                        }
                    }
                )
                .subscribe();
        }
    };
    
    // ==========================================
    // AUTH SYSTEM
    // ==========================================
    MW.Auth = {
        async init() {
            try {
                const userData = await this.fetchProfile();
                
                if (!userData) {
                    console.error('❌ MeawWorld: Cannot fetch profile');
                    return null;
                }
                
                // Check in database
                let dbUser = await MW.DB.getUser(userData.uid);
                
                if (!dbUser) {
                    // New user
                    dbUser = await MW.DB.createUser(userData.uid, userData.username);
                    console.log('🎉 New user created:', dbUser);
                } else {
                    // Existing user
                    await MW.DB.updateLastLogin(userData.uid);
                    console.log('👋 Welcome back:', dbUser);
                }
                
                MW.DB.currentUser = dbUser;
                return dbUser;
                
            } catch (error) {
                console.error('Auth error:', error);
                return null;
            }
        },
        
        async fetchProfile() {
            return new Promise((resolve) => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://www.torrentdd.com/profile.php',
                    onload: function(response) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(response.responseText, 'text/html');
                        const welcomeElement = doc.querySelector('.fw400.text-center a.text-worldpro');
                        
                        if (welcomeElement) {
                            const username = welcomeElement.textContent.trim();
                            const href = welcomeElement.getAttribute('href');
                            const uid = href.split('id=')[1];
                            
                            resolve({ username, uid });
                        } else {
                            resolve(null);
                        }
                    },
                    onerror: () => resolve(null)
                });
            });
        }
    };
    
    // ==========================================
    // UTILITIES
    // ==========================================
    MW.Utils = {
        formatNumber(num) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        },
        
        sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        },
        
        async getSupabaseClient() {
            // For Edge Functions
            return supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        }
    };
    
    // ==========================================
    // INITIALIZE
    // ==========================================
    MW.init = async function() {
        console.log('🐱 MeawWorld Core v1.0.0 Initializing...');
        MW.DB.init();
        
        // Wait for UI script to load
        await MW.Utils.sleep(100);
        
        if (typeof MW.UI !== 'undefined') {
            await MW.UI.init();
        }
    };
    
    // Auto-init
    MW.init();
    
})();