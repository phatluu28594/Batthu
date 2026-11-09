export const APP_VERSION = '3.2';

export let team = JSON.parse(localStorage.getItem('ar_team') || '[]');
export let farm = JSON.parse(localStorage.getItem('ar_farm') || '[]');
export let pokedex = JSON.parse(localStorage.getItem('ar_pokedex') || '[]');
export let eggSteps = parseInt(localStorage.getItem('ar_egg_steps') || '0');
export let playerCoins = parseInt(localStorage.getItem('ar_coins') || '500');

export let stamina = parseInt(localStorage.getItem('ar_stamina') || '15');
export let lastStaminaTime = parseInt(localStorage.getItem('ar_stamina_time') || Date.now());

export let inventory = JSON.parse(localStorage.getItem('ar_inventory') || JSON.stringify({ 
    food: 5, toy: 5, trainer: 3, meat: 0, 
    stoneKim: 0, stoneMoc: 0, stoneThuy: 0, stoneHoa: 0, stoneTho: 0 
}));

export let currentWeather = { name: 'Trời quang', icon: '☀️', effect: 'ATK +10%', buffAtk: 1.1 };

export const elements = [
    { name: 'Kim', icon: '⚔️', color: 'text-yellow-300' },
    { name: 'Mộc', icon: '🌿', color: 'text-emerald-400' },
    { name: 'Thủy', icon: '💧', color: 'text-blue-400' },
    { name: 'Hỏa', icon: '🔥', color: 'text-red-500' },
    { name: 'Thổ', icon: '🪨', color: 'text-amber-600' }
];

export const categories = {
    'Gia cầm': [
        { id: 101, name: 'Gà Ta', emoji: '🐔', cp: 120, hp: 60, maxHp: 60, atk: 70, level: 1, rarePrice: 100, attackType: 'melee' },
        { id: 102, name: 'Vịt Cỏ', emoji: '🦆', cp: 110, hp: 55, maxHp: 55, atk: 65, level: 1, rarePrice: 90, attackType: 'magic' },
        { id: 103, name: 'Ngỗng Trắng', emoji: '🦢', cp: 140, hp: 80, maxHp: 80, atk: 85, level: 1, rarePrice: 130, attackType: 'charge' },
        { id: 104, name: 'Ngan Đen', emoji: '🦃', cp: 130, hp: 75, maxHp: 75, atk: 80, level: 1, rarePrice: 120, attackType: 'melee' }
    ],
    'Gia súc': [
        { id: 201, name: 'Chó Vàng', emoji: '🐕', cp: 145, hp: 80, maxHp: 80, atk: 90, level: 1, rarePrice: 150, attackType: 'melee' },
        { id: 202, name: 'Mèo Mướp', emoji: '🐈', cp: 135, hp: 70, maxHp: 70, atk: 95, level: 1, rarePrice: 140, attackType: 'magic' },
        { id: 203, name: 'Heo Ủn Ỉn', emoji: '🐖', cp: 150, hp: 100, maxHp: 100, atk: 75, level: 1, rarePrice: 160, attackType: 'charge' },
        { id: 204, name: 'Bò Sữa', emoji: '🐂', cp: 180, hp: 120, maxHp: 120, atk: 110, level: 1, rarePrice: 200, attackType: 'melee' }
    ],
    'Tự nhiên': [
        { id: 301, name: 'Chuột Nước', emoji: '🐹', cp: 110, hp: 60, maxHp: 60, atk: 65, level: 1, rarePrice: 110, attackType: 'magic' },
        { id: 302, name: 'Chim Lửa', emoji: '🐦', cp: 185, hp: 50, maxHp: 50, atk: 140, level: 1, rarePrice: 250, attackType: 'magic' },
        { id: 303, name: 'Cáo Đỏ', emoji: '🦊', cp: 160, hp: 65, maxHp: 65, atk: 115, level: 1, rarePrice: 180, attackType: 'charge' },
        { id: 304, name: 'Sói Xám', emoji: '🐺', cp: 175, hp: 90, maxHp: 90, atk: 125, level: 1, rarePrice: 220, attackType: 'melee' }
    ],
    'Sách đỏ': [
        { id: 401, name: 'Rồng Nước', emoji: '🐉', cp: 250, hp: 150, maxHp: 150, atk: 180, level: 1, rarePrice: 500, attackType: 'magic' },
        { id: 402, name: 'Phượng Hoàng', emoji: '🦅', cp: 270, hp: 140, maxHp: 140, atk: 195, level: 1, rarePrice: 600, attackType: 'magic' },
        { id: 403, name: 'Kỳ Lân', emoji: '🦄', cp: 260, hp: 160, maxHp: 160, atk: 175, level: 1, rarePrice: 550, attackType: 'charge' }
    ]
};

export const allMonsters = Object.values(categories).flat();

export function saveInventory() { localStorage.setItem('ar_inventory', JSON.stringify(inventory)); }

export function checkPetSurvival() {
    window.team = team.filter(p => p.hp > 0 && p.hunger > 0);
    window.farm = farm.filter(p => p.hp > 0 && p.hunger > 0);
    localStorage.setItem('ar_team', JSON.stringify(team));
    localStorage.setItem('ar_farm', JSON.stringify(farm));
    if (window.updateTeamCount) window.updateTeamCount();
}