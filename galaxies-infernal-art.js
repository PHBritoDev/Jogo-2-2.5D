/** Arte vetorial exclusiva do menu, sem WebGL e sem custo no jogo.
 * Camadas de inferno/cosmos e iconografia de cada pecado. 1536×864.
 */
const esc = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
export function infernalBackdrop(){
 const pinnacles=Array.from({length:31},(_,i)=>{
  const x=710+i*27, h=28+(i*13%77), y=270-(i%5)*6;
  return '<path d="M'+x+' '+y+'l'+(8+i%8)+' -'+h+' '+(7+i%4)+' '+h+'v'+(40+i%3*18)+'h-'+(15+i%8)+'Z" fill="#08060b" stroke="#5a1015" stroke-width=".7"/>';
 }).join('');
 const embers=Array.from({length:54},(_,i)=>{
  const x=(i*251+37)%1536,y=(i*79+31)%864;
  return '<circle cx="'+x+'" cy="'+y+'" r="'+(i%3===0?1.8:.7)+'" fill="'+(i%4===0?'#ffe0a1':'#ff4b25')+'" opacity="'+(.13+(i%5)*.11)+'"/>';
 }).join('');
 return '<svg class="gx-hell-svg" viewBox="0 0 1536 864" preserveAspectRatio="xMidYMid slice" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
 '<defs><radialGradient id="infernoHalo"><stop stop-color="#fb5013" stop-opacity=".92"/><stop offset=".22" stop-color="#ff210d" stop-opacity=".72"/><stop offset=".6" stop-color="#820a13" stop-opacity=".5"/><stop offset="1" stop-color="#14020a" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="angelCloth" x1=".1" x2=".9" y1=".2" y2="1"><stop stop-color="#29344a"/><stop offset=".42" stop-color="#070a14"/><stop offset="1" stop-color="#01030a"/></linearGradient>'+
 '<radialGradient id="skyBlood"><stop stop-color="#ff9c4c"/><stop offset=".5" stop-color="#fb2509"/><stop offset=".84" stop-color="#b10b18"/><stop offset="1" stop-color="#5d080d"/></radialGradient>'+
 '<linearGradient id="lava"><stop stop-color="#260606"/><stop offset=".5" stop-color="#c72509"/><stop offset="1" stop-color="#ff7a20"/></linearGradient>'+
 '<filter id="infernoGlow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="7"/></filter>'+
 '</defs>'+
 '<ellipse cx="1175" cy="98" rx="298" ry="214" fill="url(#infernoHalo)" opacity=".55"/>'+
 '<circle cx="1134" cy="62" r="121" fill="url(#skyBlood)" stroke="#ff8a35" stroke-width="6"/>'+
 '<circle cx="1156" cy="51" r="120" fill="#1b050c" opacity=".22"/>'+
 '<circle cx="1134" cy="62" r="128" fill="none" stroke="#ff250d" stroke-opacity=".6" stroke-width="2"/>'+
 '<path d="M989 257L1026 211L1035 163L1044 211L1065 176L1077 216L1103 131L1120 225L1153 180L1159 219L1182 139L1199 226L1230 190L1240 220L1264 169L1284 238L1310 202L1329 260Z" fill="#10040b"/>'+
 '<path d="M973 251L1019 203L1035 163L1044 208L1103 131L1120 211L1182 139L1199 214L1264 169L1283 237" fill="none" stroke="#8c1820" stroke-width="2" opacity=".65"/>'+
 '<g opacity=".72">'+pinnacles+'</g>'+
 '<path d="M0 340L60 285L89 320L120 248L145 315L180 290L218 340L263 320L310 348L360 290L399 327L461 296L500 343L566 320L598 273L615 331L680 307L730 345L815 310L855 329L913 274L943 326L996 305L1040 347L1090 310L1140 331L1241 293L1282 325L1340 292L1409 321L1449 277L1536 329V650H0Z" fill="#080610"/>'+
 // fallen angel silhouette left
 '<g transform="translate(55,-22)">'+
 '<path d="M292 227C251 174 228 104 136 33C195 53 256 66 325 132C300 87 295 49 270 12C340 42 377 98 380 167L391 277Z" fill="#111824" stroke="#43516a" stroke-width="2"/>'+
 '<path d="M270 221C228 168 177 147 95 107C176 120 238 137 316 185M279 188C222 133 182 87 164 55M332 170C312 116 314 75 300 43" stroke="#6d7380" stroke-width="3" opacity=".37" fill="none"/>'+
 '<path d="M303 155C306 123 327 111 348 127C366 141 367 181 353 197L375 227L399 267L389 356L287 357L266 301L285 233Z" fill="url(#angelCloth)" stroke="#4a4050" stroke-width="2"/>'+
 '<path d="M308 143Q337 114 354 145Q346 170 342 179Q316 185 302 170Z" fill="#534340"/>'+
 '<path d="M318 154L344 148M335 166L346 161" stroke="#dfb58a" stroke-width="2" opacity=".72"/>'+
 '<path d="M287 211Q243 262 211 386L432 389Q378 254 361 216Z" fill="#060814" stroke="#55556e" stroke-opacity=".6" stroke-width="3"/>'+
 '<path d="M285 219L237 326L277 307M360 222L396 311L358 291" fill="none" stroke="#8791a0" stroke-width="3" opacity=".27"/>'+
 '<ellipse cx="328" cy="119" rx="39" ry="7" transform="rotate(-15 328 119)" fill="none" stroke="#ffdb9a" stroke-width="5" opacity=".95"/>'+
 '</g>'+
 // hanging upper chains
 '<g fill="none" stroke="#030206" stroke-width="14" opacity=".9"><path d="M0 0Q42 48 101 127T197 216"/><path d="M1536 0Q1480 54 1450 123T1378 232"/></g>'+
 '<g fill="none" stroke="#71433e" stroke-width="2" opacity=".65"><path d="M0 0Q42 48 101 127T197 216"/><path d="M1536 0Q1480 54 1450 123T1378 232"/></g>'+
 // lava under world
 '<path d="M0 770L75 738L122 777L175 733L213 755L308 707L380 741L420 690L489 743L551 699L640 740L710 687L788 736L856 695L935 739L1001 692L1087 742L1162 682L1241 734L1340 690L1417 736L1536 676V864H0Z" fill="#080508" stroke="#c32811" stroke-opacity=".75" stroke-width="3"/>'+
 '<path d="M0 820L91 786L147 812L232 780L315 813L406 759L503 810L587 766L663 798L744 757L850 810L911 764L1015 810L1113 753L1208 813L1333 756L1430 811L1536 758" fill="none" stroke="#f64015" stroke-width="3" opacity=".6"/>'+
 '<path d="M0 856L81 833L133 853L200 819L267 848L340 826L400 860M513 859L608 809L686 858L772 826L861 859M992 861L1074 819L1178 859L1261 821L1343 858L1477 818L1536 845" fill="none" stroke="#f87022" stroke-width="2.6" opacity=".7"/>'+
 embers+'</svg>';
}
function scape(id) {
 switch(id){
 case 1:return '<path d="M17 88L21 50L30 38L37 47L37 80L43 23L51 12L59 30L60 79L64 40L73 19L82 36L82 82L86 44L96 34L103 51L107 87Z" fill="#21120c" stroke="#ffbf58" stroke-width="1.4"/><path d="M20 93L30 77L42 83L55 66L69 88L87 71L103 92L115 100L99 117L26 118Z" fill="#281511" stroke="#a96522" stroke-width="2"/><path d="M28 62L28 72M50 41V65M72 41V65M92 61V76" stroke="#ffd78d" stroke-width="3"/><path d="M13 87Q64 120 113 80" stroke="#b16a24" stroke-width="10" fill="none"/><path d="M13 87Q64 120 113 80" stroke="#ffd88e" stroke-width="2" stroke-dasharray="5 6" fill="none"/>';
 case 2:return '<path d="M14 91Q29 62 44 83Q62 100 81 73Q97 50 81 36Q65 21 54 34Q47 48 62 52" fill="none" stroke="#082d1b" stroke-width="24" stroke-linecap="round"/><path d="M14 91Q29 62 44 83Q62 100 81 73Q97 50 81 36Q65 21 54 34Q47 48 62 52" fill="none" stroke="#28b85a" stroke-width="15" stroke-linecap="round"/><path d="M19 87Q30 72 45 83Q63 91 80 69Q91 52 77 37Q65 26 57 36" fill="none" stroke="#a5ff9f" stroke-opacity=".8" stroke-width="3"/><path d="M49 47Q57 33 73 42L83 51L69 58Z" fill="#175c35" stroke="#72ff92" stroke-width="1.5"/><circle cx="71" cy="45" r="2.4" fill="#ffca58"/><path d="M81 54L93 55L84 58" stroke="#ff4678" fill="none"/><path d="M19 33L31 17L41 36L24 54Z M87 88L108 83L99 110L78 100Z" fill="#08b372" stroke="#d8ffcb" stroke-width=".6" opacity=".75"/>';
 case 3:return '<path d="M9 93L23 81L37 88L48 75L62 83L80 74L99 81L115 99V120H9Z" fill="#916013" stroke="#ffcf65" stroke-width="1"/><g fill="#f6c442" stroke="#ffeb8e" stroke-width=".9"><ellipse cx="24" cy="91" rx="12" ry="4"/><ellipse cx="48" cy="91" rx="12" ry="4"/><ellipse cx="72" cy="88" rx="12" ry="4"/><ellipse cx="92" cy="96" rx="12" ry="4"/><ellipse cx="40" cy="102" rx="11" ry="4"/><ellipse cx="78" cy="108" rx="11" ry="4"/></g><path d="M39 52L91 52L96 82L42 86Z" fill="#603911" stroke="#ffc765" stroke-width="3"/><path d="M34 51L44 33L84 30L100 49L91 55L38 55Z" fill="#ad6716" stroke="#ffe5a1" stroke-width="2"/><path d="M47 56L85 56L85 78L47 81Z" fill="#bb8023" stroke="#ffe5a1"/><path d="M64 57V80M56 65H74" stroke="#f9db74" stroke-width="2"/>';
 case 4:return '<path d="M12 94L30 70L40 81L51 45L64 79L76 35L90 70L102 56L116 94L101 116L24 112Z" fill="#d4edff" stroke="#638bb0" stroke-width="2"/><path d="M34 83L43 40L50 25L55 40L60 86M63 88L71 19L78 8L85 26L90 86" stroke="#e9f9ff" stroke-width="9" fill="none"/><path d="M50 35L50 15M76 20L76 0" stroke="#f0ffff" stroke-width="3"/><path d="M24 101L37 93L49 100L66 89L88 99L103 94" fill="none" stroke="#fff" stroke-width="7"/>';
 case 5:return '<ellipse cx="62" cy="69" rx="49" ry="38" fill="#40090d" stroke="#a1383a" stroke-width="7"/><path d="M21 53Q58 28 104 53Q91 64 63 64Q36 64 21 53Z" fill="#e5a2a3"/><path d="M21 73Q60 109 105 73Q94 62 63 62Q35 62 21 73Z" fill="#7d0c17" stroke="#e2a2a2" stroke-width="3"/><path d="M25 54L31 75L40 56L50 78L60 56L70 78L80 54L90 75L101 54" fill="#fff1cc" stroke="#4a1211"/><path d="M29 83L35 69L45 90L55 73L65 93L75 73L85 90L94 70L100 82" fill="#ffdeb6" stroke="#51151a"/><path d="M48 62Q60 58 72 62" stroke="#ff6c70" fill="none" stroke-width="4"/>';
 case 6:return '<path d="M30 18L42 42L31 61L49 83L42 113M82 9L72 37L88 58L69 74L91 102" stroke="#ff7d22" stroke-width="7" fill="none"/><path d="M30 18L42 42L31 61L49 83L42 113M82 9L72 37L88 58L69 74L91 102" stroke="#ffd075" stroke-width="2.5" fill="none"/><path d="M12 39Q48 62 114 32M11 87Q75 62 117 98" fill="none" stroke="#180b13" stroke-width="10" stroke-dasharray="19 6"/><path d="M12 39Q48 62 114 32M11 87Q75 62 117 98" fill="none" stroke="#a75b4d" stroke-width="2" stroke-dasharray="19 6"/>';
 case 7:return '<path d="M10 118Q15 80 38 75Q19 41 47 22Q66 9 86 21Q109 39 100 67Q126 91 120 122" fill="#4e0737" stroke="#ff70c6" stroke-width="2"/><path d="M46 87Q60 76 54 61Q45 43 57 31Q70 21 85 37Q95 55 82 72L91 91Q107 95 110 120L24 120Q26 90 46 87Z" fill="#f3a0a4" stroke="#efc5bc" stroke-width="2"/><path d="M44 83Q26 58 38 29Q57 12 77 20Q104 11 111 38Q118 59 95 89Q104 49 88 33Q79 22 63 30Q43 35 50 62Z" fill="#41142e" stroke="#ef5ab5" stroke-width="3"/><path d="M62 50Q68 47 73 49M81 48Q87 45 91 47" stroke="#3e1124" stroke-width="2"/><path d="M76 58Q78 65 76 67M69 76Q79 80 88 73" stroke="#a84a65" stroke-width="2" fill="none"/><path d="M88 32Q116 25 115 52M35 43Q28 72 47 90" stroke="#ffb2de" stroke-width="3" fill="none"/><g fill="#e82d87" stroke="#ffc5e5" stroke-width="1"><circle cx="19" cy="95" r="11"/><circle cx="111" cy="98" r="12"/><circle cx="24" cy="115" r="8"/><circle cx="107" cy="118" r="8"/></g><path d="M19 85Q30 95 19 104Q9 95 19 85M111 87Q124 98 111 109Q100 98 111 87" fill="none" stroke="#ffbce4" stroke-width="2"/>';
 }
 return '';
}
export function infernalPlanetSvg(id, locked=false){
 const colors=['#ffb23e','#19e879','#ffb331','#a5dbff','#fb5477','#ff471a','#ff42ba'];
 const c=colors[id-1]||'#ffd89a', key='gxinf'+id+(locked?'l':'o');
 // Circle is a true globe with light from upper left, ocean/rock shadows, and a bright rim.
 return '<svg class="gx-planet gx-infernal-planet" viewBox="0 0 130 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
 '<defs><radialGradient id="'+key+'s" cx="32%" cy="23%" r="83%"><stop stop-color="'+c+'" stop-opacity=".94"/><stop offset=".35" stop-color="'+c+'" stop-opacity=".58"/><stop offset=".73" stop-color="#241420"/><stop offset="1" stop-color="#05030b"/></radialGradient>'+
 '<radialGradient id="'+key+'g"><stop offset=".56" stop-color="'+c+'" stop-opacity=".22"/><stop offset=".8" stop-color="'+c+'" stop-opacity=".06"/><stop offset="1" stop-color="'+c+'" stop-opacity="0"/></radialGradient>'+
 '<clipPath id="'+key+'c"><circle cx="65" cy="65" r="50"/></clipPath></defs>'+
 '<circle cx="65" cy="65" r="65" fill="url(#'+key+'g)"/><circle cx="65" cy="65" r="51" fill="url(#'+key+'s)" stroke="'+c+'" stroke-opacity=".65" stroke-width="1"/>'+
 '<g clip-path="url(#'+key+'c)">'+scape(id)+'</g>'+
 '<path d="M24 42Q43 16 70 17" stroke="#fff8dc" stroke-opacity=".58" stroke-width="2.5" fill="none"/>'+
 '<ellipse cx="65" cy="65" rx="62" ry="13" transform="rotate(-15 65 65)" fill="none" stroke="'+c+'" stroke-opacity=".64" stroke-width="2"/>'+
 '<ellipse cx="65" cy="65" rx="62" ry="13" transform="rotate(-15 65 65)" fill="none" stroke="#fff0c4" stroke-opacity=".64" stroke-width=".7"/>'+
 '<circle cx="65" cy="65" r="51" fill="none" stroke="'+c+'" stroke-width="2.2" stroke-opacity=".68"/>'+
 '</svg>';
}
