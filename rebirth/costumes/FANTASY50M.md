# 5천만 골드 판타지 코스튬

기존 12개 ID, 직업, 가격, 보유 보너스와 렌더링 크기를 유지하고 외형을 교체한다. 이미지 제작은 내장 ImageGen을 사용한다.

공통 전투 시트 프롬프트: 투명 배경, 동일 캐릭터의 5열×5행 포즈. 열은 정면·우전방·우측·우후방·후면, 행은 대기·왼발 걷기·오른발 걷기·공격 준비·공격 발동. 서양 하이 판타지 스타일, 중국 의복·도사·부적·연꽃·중국 문양 제외. 일러스트는 해당 시트를 참조해 동일 인물의 전신 상점 그림 제작.

- **성휘의 세라핌 기사** (`celadon-dragon-guardian`): Seraph knight, luminous ivory and gold European articulated plate, sapphire heart jewel, flowing platinum hair, compact six angel wings, magnificent crystal longsword
- **흑장미 서약 기사** (`vermillion-phoenix-sword`): Black rose oath knight, elegant blackened European plate armor with crimson rose metal filigree, silver hair, burgundy velvet cape, enormous ruby greatsword
- **별무리 대마도사** (`azure-cloud-taoist`): Astral archmage, midnight blue tailored wizard dress, silver constellation embroidery, wide pointed witch hat, silver lavender hair, crystal orb staff and orbiting small star jewels
- **오로라 수정 마녀** (`violet-thunder-taoist`): Aurora crystal witch, opalescent lilac corset dress and short layered skirt, translucent ice crystal wings, pale pink hair, crescent crystal staff, luminous rainbow magic
- **달빛 은사슴 궁수** (`moon-rabbit-ranger`): Moonlit silver stag elven ranger, silver white and soft cyan leather cuirass, short split cloak, silver hair and pointed elf ears, delicate antler tiara, crescent longbow
- **하트윙 큐피드 궁수** (`golden-crow-ranger`): Cupid archer: blush ivory dress, pink bob, angel wings, heart bow and arrows
- **나비꿈 쌍검 무희** (`porcelain-lotus-assassin`): Dream butterfly twinblade rogue, luminous periwinkle and pearl fitted European fantasy corset armor and short skirt, blue butterfly wings, pale blue bob haircut, two curved crystal daggers
- **월식 가면 암살자** (`ink-plum-assassin`): Eclipse masquerade assassin, black and amethyst fitted gothic fantasy leather armor, tiny silver masquerade half mask, short white hair, raven feather mantle, twin violet daggers
- **심해왕관 해적 제독** (`dragon-sea-gunner`): Abyss crown pirate admiral, teal navy European naval frock coat, ornate tricorn hat with aquamarine jewel, platinum hair, coral crown shoulder details, enormous elegant pearl crystal hand cannon
- **별항해 천공 총사** (`vermillion-silk-gunner`): Stellar sky corsair, cream and cobalt European musketeer jacket with fitted trousers and tall boots, feathered tricorn, golden hair, compact mechanical wing backpack, ornate star musket
- **진주빛 천상의 성녀** (`white-lotus-healer`): Pearlescent celestial saint, ivory and blush European cathedral cleric dress with corset bodice and delicate lace, flowing pink hair, small angel wings, radiant circular halo, rose quartz cross staff
- **세계수 요정 사제** (`crane-mist-healer`): World tree fairy priest, emerald ivory European fantasy druid dress, golden leaf circlet, long mint green hair, translucent leaf fairy wings, living branch staff with green heart crystal

## 비율 보정 및 큐피드 교체

내장 ImageGen으로 기존 백조의 호수 기사 일러스트·전투 시트를 참조해 같은 SD 비율로 재제작했다. 상점 일러스트는 768×960 투명 캔버스의 736×768 영역에 맞춘다. 전투는 320px 셀, 1600×1600 시트, 80프레임 규칙을 유지하고 개별 확대 보정을 제거해 기존과 동일한 bodySize 기준으로 렌더한다. 큐피드는 golden-crow-ranger ID를 유지해 기존 보유·장착 상태를 보존한다.
