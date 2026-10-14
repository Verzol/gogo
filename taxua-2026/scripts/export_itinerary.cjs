// Optional maintenance helper, never required to run or build the website.
// Recreate the no-JavaScript reading copy after editing data.js.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname,'..');
const context = {};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8') + ';this.trip=TRIP_DATA',context);
const trip = context.trip;
const esc = value => String(value || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const days = trip.days.map((day,index) => `<section id="schedule-${index}"><h2>${esc(day.label)}: ${esc(day.date)}/2026</h2><h3>${esc(day.title)}</h3>${day.blocks.map(b=>`<article><p><strong>${esc(b.time || b.period + ' - Chưa chốt giờ')}</strong>${b.optional ? ' (Tùy chọn)' : ''}</p><h4>${esc(b.activity)}</h4><p>${esc(b.description)}</p>${b.places ? b.places.map(p=>`<p><strong>${esc(p.name)}</strong>: ${esc(p.description)}</p>`).join('') : ''}${b.note ? `<p>${esc(b.note)}</p>` : ''}${Number.isFinite(b.cost) ? `<p>Dự kiến ${Number(b.cost).toLocaleString('vi-VN')} ₫/người</p>` : ''}</article>`).join('')}</section>`).join('');
const places = `<section><h2>Một chút về những nơi mình ghé</h2>${Object.values(trip.placeGuides).map(p=>`<div><h3>${esc(p.name)}</h3>${p.paragraphs.map(text=>`<p>${esc(text)}</p>`).join('')}<p><a href="${esc(p.source.url)}" target="_blank" rel="noopener noreferrer">Đọc thêm · ${esc(p.source.label)} ↗</a></p></div>`).join('')}</section>`;
const fund = `<section aria-labelledby="fundTitle"><h2 id="fundTitle">${esc(trip.fund.title)}</h2><p>${esc(trip.fund.intro)}</p><p>${esc(trip.fund.contributionIntro)} <strong>${Number(trip.fund.amountPerPerson).toLocaleString('vi-VN')} ₫ / ${esc(trip.fund.amountLabel)}</strong> ${esc(trip.fund.contributionOutro)} ${esc(trip.fund.reminder)}</p><p><a href="${esc(trip.fund.url)}" target="_blank" rel="noopener noreferrer">${esc(trip.fund.action)} ↗</a> · ${esc(trip.fund.actionHint)}</p></section>`;
fs.writeFileSync(path.join(root,'itinerary.html'),`<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Lịch trình đầy đủ | Tà Xùa x gogo</title><link rel="icon" href="./figures/decor/favicon.png"><link rel="stylesheet" href="./fonts.css"><style>body{font-family:'Be Vietnam Pro',sans-serif;line-height:1.8;color:#25364d;background:#f8f7f2;max-width:760px;margin:auto;padding:32px 20px}h1,h2,h3,h4{font-family:Fraunces,Georgia,serif}h1{font-size:2.8rem}h2{margin-top:48px}h4{font-size:1.3rem;margin:10px 0}article{margin:30px 0;padding:20px;background:#edf0f3;border-radius:14px}a{color:#3e4e7a}a:focus-visible{outline:3px solid #3e4e7a;outline-offset:5px}</style></head><body><header><a href="./index.html">Về nhật ký</a><h1>Tà Xùa x gogo</h1><p>${esc(trip.dateRange)}</p></header><main>${days}${fund}${places}<section><h2>Đồ cần mang</h2><ul>${trip.packingList.items.map(i=>`<li>${esc(i.text)}</li>`).join('')}</ul></section></main></body></html>\n`);
console.log('Exported the full 24-event itinerary for readers without JavaScript.');
