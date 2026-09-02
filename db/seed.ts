export type SeedAccount = {
  code: string;
  role: 'partner' | 'admin';
  memberName: string;
  projectName: string;
  displayName: string;
};

export const DEFAULT_PASSWORD = '123456';

export const SEED_ACCOUNTS: SeedAccount[] = [
  { code: 'NJ01', role: 'partner', memberName: '陳葶瑀', projectName: '百鄰果客廳 x 社計宅宅', displayName: 'NJ01百鄰果客廳 x 社計宅宅' },
  { code: 'NJ02', role: 'partner', memberName: '', projectName: '食堂學堂幸福滿堂', displayName: 'NJ02食堂學堂幸福滿堂' },
  { code: 'NJ03', role: 'partner', memberName: '楊哲維', projectName: '看見南港－文史影像三部曲', displayName: 'NJ03看見南港－文史影像三部曲' },
  { code: 'NJ05', role: 'partner', memberName: '黃敬婷', projectName: 'JOY愛閱讀共讀計畫', displayName: 'NJ05JOY愛閱讀共讀計畫' },
  { code: 'NJ06', role: 'partner', memberName: '劉澄雍', projectName: '青年在南港_在地影像and身體敘事', displayName: 'NJ06青年在南港_在地影像and身體敘事' },
  { code: 'NJ07', role: 'partner', memberName: '温晨恩', projectName: '《聲聚計畫》-聲聲相聚，共築鄰心計畫書', displayName: 'NJ07《聲聚計畫》-聲聲相聚，共築鄰心計畫書' },
  { code: 'NJ09', role: 'partner', memberName: '蔡嘉哲', projectName: '有聲社宅計畫：讓社區能「聽見」', displayName: 'NJ09有聲社宅計畫：讓社區能「聽見」' },
  { code: 'NJ10', role: 'partner', memberName: '魏彣翰', projectName: '心港諮商所：讓每一顆心靠岸', displayName: 'NJ10心港諮商所：讓每一顆心靠岸' },
  { code: 'NJ11', role: 'partner', memberName: '温宛璇', projectName: '社區共好三部曲： 共食・共學・共伴', displayName: 'NJ11社區共好三部曲： 共食・共學・共伴' },
  { code: 'NJ12', role: 'partner', memberName: '曾語蓁', projectName: '社區共織：以布作療癒打造親子藝文共好生活', displayName: 'NJ12社區共織：以布作療癒打造親子藝文共好生活' },
  { code: 'NJ13', role: 'partner', memberName: '黃靖純', projectName: '「一起住吧！共繪一條回家的路」', displayName: 'NJ13「一起住吧！共繪一條回家的路」' },
  { code: 'NJ14', role: 'partner', memberName: '張雁評', projectName: '發現南港自然驚喜：居民夜間觀察行動', displayName: 'NJ14發現南港自然驚喜：居民夜間觀察行動' },
  { code: 'NJ15', role: 'partner', memberName: '魏子喬', projectName: '社區健康月月講', displayName: 'NJ15社區健康月月講' },
  { code: 'NJ16', role: 'partner', memberName: '游東諭', projectName: '南港小南生-南港機廠社宅共好計畫', displayName: 'NJ16南港小南生-南港機廠社宅共好計畫' },
  { code: 'NJ17', role: 'partner', memberName: '吳芃蒂', projectName: '光影機廠：青年×攝影×社區×回饋循環', displayName: 'NJ17光影機廠：青年×攝影×社區×回饋循環' },
  { code: 'NJ18', role: 'partner', memberName: '蘇珮儀', projectName: '用瑜珈共創身心平衡的美好生活', displayName: 'NJ18用瑜珈共創身心平衡的美好生活' },
  { code: 'NJ19', role: 'partner', memberName: '郭凡傑', projectName: '桌遊總動員：南港社區親子共學計畫', displayName: 'NJ19桌遊總動員：南港社區親子共學計畫' },
  { code: 'NJ21', role: 'partner', memberName: '徐千惠', projectName: '動手奏樂起來!STEAM手作工作坊', displayName: 'NJ21動手奏樂起來!STEAM手作工作坊' },
  { code: 'NJ22', role: 'partner', memberName: '李思巧', projectName: '南港共鳴計畫', displayName: 'NJ22南港共鳴計畫' },
  { code: 'NJ24', role: 'partner', memberName: '瞿長江', projectName: '「不插電」程式邏輯：遊戲設計課', displayName: 'NJ24「不插電」程式邏輯：遊戲設計課' },
  { code: 'NJ25', role: 'partner', memberName: '吳郁梵', projectName: '故事漂島 Story Islands', displayName: 'NJ25故事漂島 Story Islands' },
  { code: 'NJ27', role: 'partner', memberName: '張閔凱', projectName: '鄰里雲端便利換計劃 ——讓社區流動起來！', displayName: 'NJ27鄰里雲端便利換計劃 ——讓社區流動起來！' },
  { code: 'NJ28', role: 'partner', memberName: '羅煜恒', projectName: 'ARK_社宅AI方舟計畫-1人1戶', displayName: 'NJ28ARK_社宅AI方舟計畫-1人1戶' },
  { code: 'NJ29', role: 'partner', memberName: '陳奕澄', projectName: '早安 共食之間', displayName: 'NJ29早安 共食之間' },
  { code: 'NJ32', role: 'partner', memberName: '杜采緹', projectName: '白話法研所', displayName: 'NJ32白話法研所' },
  { code: 'NJ33', role: 'partner', memberName: '張日昇', projectName: '攀上連結－社宅引路人計畫', displayName: 'NJ33攀上連結－社宅引路人計畫' },
  { code: 'ADMIN', role: 'admin', memberName: '平台組', projectName: '平台組管理', displayName: '平台組管理' },
];
