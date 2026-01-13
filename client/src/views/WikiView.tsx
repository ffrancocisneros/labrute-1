import { BOSS_GOLD_REWARD, BOSS_XP_REWARD, bosses, BruteRankings, ClanWarMaxParticipants, ClanWarPointReward, DailyModifierOdds, DailyTournamentGoldReward, DailyTournamentXpReward, getBruteGoldValue, getWinsNeededToRankUp, GlobalTournamentGoldReward, GlobalTournamentXpReward, pets, RESET_PRICE, weapons, WeaponType } from '@labrute/core';
import { BossName, FightModifier } from '@labrute/prisma';
import { Box, Card, CardContent, Divider, Drawer, Grid, IconButton, List, ListItem, ListItemButton, ListItemText, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FantasyButton from '../components/FantasyButton';
import Page from '../components/Page';
import Text from '../components/Text';
import { EmojiEvents, Groups, KeyboardDoubleArrowUp, Menu, Pets, Shield, SportsKabaddi, TrendingUp } from '@mui/icons-material';

const sacrificeExamples = [
  { rank: 11, level: 10 },
  { rank: 11, level: 20 },
  { rank: 11, level: 30 },
  { rank: 11, level: 40 },
  { rank: 11, level: 50 },
  { rank: 10, level: 10 },
  { rank: 9, level: 20 },
  { rank: 8, level: 30 },
  { rank: 7, level: 40 },
  { rank: 6, level: 50 },
];

export const WikiView = () => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMenuOpen(false); // Cerrar el menú después de hacer scroll
    }
  }, []);

  const menuItems = [
    { id: 'rangos', label: t('rankUp'), icon: KeyboardDoubleArrowUp },
    { id: 'torneos', label: t('tournaments'), icon: EmojiEvents },
    { id: 'oro', label: t('gold'), icon: null },
    { id: 'clanes', label: t('wiki.clans'), icon: Groups },
    { id: 'stats-principales', label: 'Stats Principales', icon: TrendingUp },
    { id: 'stats-secundarias', label: 'Stats Secundarias', icon: TrendingUp },
    { id: 'mascotas', label: 'Mascotas', icon: Pets },
    { id: 'modificadores', label: 'Modificadores Diarios', icon: SportsKabaddi },
    { id: 'clanes-expandida', label: 'Clanes (Detallado)', icon: Groups },
    { id: 'armas', label: 'Armas', icon: Shield },
  ];

  return (
    <Page
      title={`${t('wiki')} ${t('MyBrute')}`}
      description={t('wiki.desc')}
      headerUrl=""
    >
      <Paper sx={{
        mx: 4,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
      >
        <IconButton
          onClick={() => setMenuOpen(true)}
          sx={{ mr: 1 }}
          color="primary"
        >
          <Menu />
        </IconButton>
        <Text h3 bold upperCase typo="LaBrute" sx={{ mr: 2 }}>{t('wiki')}</Text>
      </Paper>
      {/* MENU LATERAL (DRAWER) */}
      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            bgcolor: 'background.paperLight',
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Text h6 bold upperCase typo="LaBrute" color="secondary" sx={{ mb: 1 }}>
            Índice
          </Text>
          <List dense>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <ListItem key={item.id} disablePadding>
                  <ListItemButton
                    onClick={() => scrollToSection(item.id)}
                    sx={{
                      borderRadius: 1,
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    {Icon && <Icon sx={{ mr: 1, fontSize: 18 }} />}
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: '0.875rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Drawer>
      {/* CONTENIDO */}
      <Box sx={{ mx: 4 }}>
        <Paper sx={{
          display: 'flex',
          justifyContent: 'center',
          flexWrap: 'wrap',
          bgcolor: 'background.paperLight',
          mt: -2,
        }}
        >
          <Grid container spacing={2}>
            {/* Fila 1: Rangos y Clanes */}
            <Grid item xs={12} sm={6} id="rangos">
              {/* RANK UP */}
              <Card>
                <CardContent>
                  <FantasyButton color="success" sx={{ ml: 0 }}>
                    <KeyboardDoubleArrowUp sx={{ verticalAlign: 'middle', mr: 1 }} />
                    {t('rankUp')}
                  </FantasyButton>
                  <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>
                    {t('wiki.howToRankup')}
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary">
                    • {t('wiki.winDaily')}
                  </Text>
                  {BruteRankings.slice(0, 3).map((rank) => (
                    <Text body2 key={rank}>
                      <Box
                        component="img"
                        src={`/images/rankings/lvl_${rank}.webp`}
                        sx={{ width: 16, mx: 1, verticalAlign: 'middle' }}
                      />
                      →
                      <Box
                        component="img"
                        src={`/images/rankings/lvl_${rank - 1}.webp`}
                        sx={{ width: 16, mx: 1, verticalAlign: 'middle' }}
                      />
                      {t('wiki.wins', { count: getWinsNeededToRankUp({ ranking: rank, ascensions: 0 }) })}
                    </Text>
                  ))}
                  <Text body2>{t('wiki.restartAfterRankup')}</Text>
                  <Text body2>{t('wiki.previousDestiny')}</Text>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} id="clanes">
              {/* CLANS */}
              <Card>
                <CardContent>
                  <FantasyButton color="warning" sx={{ ml: 0 }}>
                    <Groups sx={{ verticalAlign: 'middle', mr: 1 }} />
                    {t('wiki.clans')}
                  </FantasyButton>
                  <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>
                    {t('wiki.increaseClanCapacity')}
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary">
                    • {t('wiki.defeatBoss')}
                  </Text>
                  <Text body2>{t('wiki.bossExplanation')}</Text>
                  <Box
                    component="img"
                    display="block"
                    src="/images/wiki/defeat-boss.png"
                    sx={{ mt: 1, maxWidth: 200 }}
                  />
                </CardContent>
              </Card>
            </Grid>
            {/* Fila 2: Torneos y Oro */}
            <Grid item xs={12} sm={6} id="torneos">
              {/* TOURNAMENTS */}
              <Card>
                <CardContent>
                  <FantasyButton color="warning" sx={{ ml: 0 }}>
                    <EmojiEvents sx={{ verticalAlign: 'middle', mr: 1 }} />
                    {t('tournaments')}
                  </FantasyButton>
                  <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>
                    {t('wiki.howWork')}
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary">
                    • {t('dailyTournament')}
                  </Text>
                  <Text body2>- {t('wiki.manualRegister')}</Text>
                  <Text body2>- Participantes: brutos registrados manualmente</Text>
                  <Text body2>
                    - Recompensas: {DailyTournamentGoldReward} oro +{' '}
                    {DailyTournamentXpReward} XP por victoria
                  </Text>
                  <Text body2>- {t('wiki.allowRankUp')}</Text>
                  <Text body2>
                    - {t('wiki.xpPerWin', { count: DailyTournamentXpReward })}
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                    • {t('globalTournament')}
                  </Text>
                  <Text body2>- {t('wiki.autoRegister')}</Text>
                  <Text body2>
                    - Participantes: todos los brutos activos del día anterior
                  </Text>
                  <Text body2>
                    - Recompensas: {GlobalTournamentGoldReward} oro +{' '}
                    {GlobalTournamentXpReward} XP por victoria
                  </Text>
                  <Text body2>- No permite subir de rango</Text>
                  <Text body2>- {t('wiki.activePreviousDay')}</Text>
                  <Text body2>
                    - {t('wiki.xpPerWin', { count: GlobalTournamentXpReward })}
                  </Text>
                  <Text body2 mt={1}>
                    {t('wiki.addedDelayedXP', {
                      daily: 3,
                      global: 4,
                      total: 3 * DailyTournamentXpReward + 4 * GlobalTournamentXpReward,
                    })}
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                    • {t('wiki.unlimitedGlobalTourney')}
                  </Text>
                  <Text body2>- Solo para brutos no registrados en torneos</Text>
                  <Text body2>- {t('wiki.unregisteredOnly')}</Text>
                  <Text body2>- {t('wiki.noRewards')}</Text>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} id="oro">
              {/* GOLD */}
              <Card>
                <CardContent>
                  <FantasyButton color="warning" sx={{ ml: 0 }}>
                    <Box component="img" src="/images/gold.png" sx={{ verticalAlign: 'middle', mr: 1 }} />
                    {t('gold')}
                  </FantasyButton>
                  <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>
                    {t('wiki.howToGetGold')}
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary">
                    • {t('wiki.sacrifice')}
                  </Text>
                  <Box sx={{ columns: 2 }}>
                    {sacrificeExamples.map(({ level, rank }) => (
                      <Text body2 key={`${level}-${rank}`}>
                        <Box
                          component="img"
                          src={`/images/rankings/lvl_${rank}.webp`}
                          sx={{ width: 16, mx: 1, verticalAlign: 'middle' }}
                        />
                        {t('wiki.level', { count: level })} = {getBruteGoldValue({ level, ranking: rank, eventId: null })}
                        <Box
                          component="img"
                          src="/images/gold.png"
                          sx={{ ml: 0.5, verticalAlign: 'middle' }}
                        />
                      </Text>
                    ))}
                  </Box>
                  <Text body2>{t('wiki.sameNameAfterSacrifice')}</Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary">
                    • {t('wiki.winDailyTourney')} = {DailyTournamentGoldReward}
                    <Box
                      component="img"
                      src="/images/gold.png"
                      sx={{ ml: 0.5, verticalAlign: 'middle' }}
                    />
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary">
                    • {t('wiki.winGlobalTourney')} = {GlobalTournamentGoldReward}
                    <Box
                      component="img"
                      src="/images/gold.png"
                      sx={{ ml: 0.5, verticalAlign: 'middle' }}
                    />
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary">
                    • {t('wiki.beatClanBoss')}
                  </Text>
                  <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>
                    {t('wiki.howToUseGold')}
                  </Text>
                  <Text h6 upperCase typo="LaBrute" color="secondary">
                    • {t('wiki.resetBrute')} = {RESET_PRICE}
                    <Box
                      component="img"
                      src="/images/gold.png"
                      sx={{ ml: 0.5, verticalAlign: 'middle' }}
                    />
                  </Text>
                  <Text body2>{t('wiki.resetExample')}</Text>
                  <Text body2>{t('wiki.resetExample2')}</Text>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
        {/* STATS SECTION */}
        <Paper
          id="stats-principales"
          sx={{
            bgcolor: 'background.paperLight',
            mt: 2,
          }}
        >
          <Grid container spacing={2} sx={{ p: 2 }}>
            <Grid item xs={12}>
              <FantasyButton color="primary" sx={{ ml: 0 }}>
                <TrendingUp sx={{ verticalAlign: 'middle', mr: 1 }} />
                Estadísticas (Stats)
              </FantasyButton>
              <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>
                Stats Principales
              </Text>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {/* Fuerza */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Text h6 bold upperCase typo="LaBrute" color="secondary">
                        • Fuerza (Strength)
                      </Text>
                      <Text body2>- Aumenta el daño físico que infliges</Text>
                      <Text body2>
                        - Interactúa con habilidades como {t('herculeanStrength')}
                      </Text>
                      <Text body2 bold sx={{ mt: 1, color: 'success.main' }}>
                        Efectos numéricos:
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Armas normales: Cada punto de fuerza aumenta el daño base en un
                        {' '}20% + (daño base × 5%)
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Armas arrojadizas: Cada punto de fuerza añade +0.1 de daño, cada
                        {' '}punto de agilidad añade +0.15
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Ejemplo: Con 10 de fuerza y un arma de daño base 5, el daño
                        {' '}aumenta en ~2.5 puntos
                      </Text>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Agilidad */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Text h6 bold upperCase typo="LaBrute" color="secondary">
                        • Agilidad (Agility)
                      </Text>
                      <Text body2>
                        - Mejora la velocidad de ataque y la capacidad de esquivar
                      </Text>
                      <Text body2>
                        - Interactúa con habilidades como {t('felineAgility')}
                      </Text>
                      <Text body2 bold sx={{ mt: 1, color: 'success.main' }}>
                        Efectos numéricos:
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Evasión: Cada punto de diferencia de agilidad (vs oponente)
                        {' '}afecta la evasión en ±1%
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • La diferencia se multiplica por 2, con máximo de ±40 puntos de
                        {' '}diferencia
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Ejemplo: Si tienes 15 de agilidad y tu oponente 10, tu evasión
                        {' '}aumenta en ~10%
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Velocidad de ataque: Afecta el tempo (velocidad de golpe) que
                        {' '}determina cuándo atacas
                      </Text>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Velocidad */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Text h6 bold upperCase typo="LaBrute" color="secondary">
                        • Velocidad (Speed)
                      </Text>
                      <Text body2>- Determina quién ataca primero en el combate</Text>
                      <Text body2>
                        - Interactúa con habilidades como {t('lightningBolt')}
                      </Text>
                      <Text body2 bold sx={{ mt: 1, color: 'success.main' }}>
                        Efectos numéricos:
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Iniciativa: Determina el orden de turnos (menor iniciativa =
                        {' '}ataca primero)
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • La velocidad se combina con el tempo del arma para calcular la
                        {' '}iniciativa
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Ejemplo: Mayor velocidad = menor iniciativa = más probabilidad
                        {' '}de atacar primero
                      </Text>
                    </CardContent>
                  </Card>
                </Grid>
                {/* Resistencia */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Text h6 bold upperCase typo="LaBrute" color="secondary">
                        • Resistencia (Endurance)
                      </Text>
                      <Text body2>- Aumenta los puntos de vida (HP) del bruto</Text>
                      <Text body2>
                        - Interactúa con habilidades como {t('vitality')}
                      </Text>
                      <Text body2 bold sx={{ mt: 1, color: 'success.main' }}>
                        Efectos numéricos:
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • HP: Cada punto de resistencia aumenta los HP en +6 puntos
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Fórmula: HP = 50 + (Resistencia + Nivel × 0.25) × 6
                      </Text>
                      <Text body2 sx={{ ml: 2 }}>
                        • Ejemplo: Con 10 de resistencia y nivel 5: HP = 50 + (10 + 1.25)
                        {' '}× 6 = 117 HP
                      </Text>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Box id="stats-secundarias">
                <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={2}>
                  Stats Secundarias
                </Text>
                <Text body2>
                  Estas stats afectan el combate de manera más específica y se obtienen
                  {' '}principalmente de armas y habilidades:
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('reversal')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Probabilidad de revertir un ataque bloqueado
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('evasion')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Probabilidad de esquivar un ataque enemigo
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('counter')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Probabilidad de contraatacar después de bloquear
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('armor')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Reduce el daño recibido (máximo 90% de reducción)
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('initiative')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Determina el orden de turnos (menor valor = ataca primero)
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('regeneration')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Regenera HP cada turno (porcentaje del HP máximo)
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('hitSpeed')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Reduce el tiempo entre ataques (velocidad de golpe)
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('dexterity')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Reduce la evasión del oponente
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('block')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Probabilidad de bloquear un ataque
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('accuracy')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Reduce la evasión del oponente
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('disarm')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Probabilidad de desarmar al oponente
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('combo')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Probabilidad de realizar un combo (ataques múltiples)
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('deflect')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Probabilidad de desviar proyectiles
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('criticalChance')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Probabilidad de realizar un golpe crítico
                </Text>
                <Text h6 upperCase typo="LaBrute" color="secondary" mt={1}>
                  • {t('criticalDamage')}
                </Text>
                <Text body2 sx={{ ml: 2 }}>
                  - Multiplicador de daño cuando se realiza un crítico
                </Text>
                <Divider sx={{ my: 2 }} />
                <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={2}>
                  Interacciones
                </Text>
                <Text body2>
                  - Las habilidades pueden modificar estos stats permanentemente
                </Text>
                <Text body2>
                  - Las armas tienen stats que se suman a los del bruto durante el combate
                </Text>
                <Text body2>
                  - Los stats se calculan dinámicamente según el nivel y las habilidades
                  {' '}del brute
                </Text>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        {/* PETS SECTION */}
        <Paper
          id="mascotas"
          sx={{
            bgcolor: 'background.paperLight',
            mt: 2,
          }}
        >
          <Grid container spacing={2} sx={{ p: 2 }}>
            <Grid item xs={12}>
              <FantasyButton color="success" sx={{ ml: 0 }}>
                <Pets sx={{ verticalAlign: 'middle', mr: 1 }} />
                Mascotas
              </FantasyButton>
              <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>Información General</Text>
              <Text body2>- Cada mascota tiene 3 niveles (tiers) que mejoran sus stats</Text>
              <Text body2>
                - El enduranceMalus reduce la resistencia del bruto al tener la mascota
              </Text>
              <Text body2>
                - Los stats de las mascotas se escalan según el tier y el nivel del bruto
              </Text>
              <Divider sx={{ my: 2 }} />
              {Object.values(pets).map((pet) => (
                <Box key={pet.name} sx={{ mb: 3 }}>
                  <Text h6 bold upperCase typo="LaBrute" color="secondary">
                    {t(pet.name)}
                  </Text>
                  <Text body2>- Endurance Malus: {pet.enduranceMalus}</Text>
                  <Text body2>- {t('odds')}: {pet.odds}</Text>
                  <Text body2 bold mt={1}>Stats por Tier:</Text>
                  <TableContainer component={Paper} sx={{ mt: 1, maxWidth: 600 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Stat</TableCell>
                          <TableCell align="right">Tier 1</TableCell>
                          <TableCell align="right">Tier 2</TableCell>
                          <TableCell align="right">Tier 3</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>Fuerza</TableCell>
                          <TableCell align="right">{pet.strength[0]}</TableCell>
                          <TableCell align="right">{pet.strength[1]}</TableCell>
                          <TableCell align="right">{pet.strength[2]}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Agilidad</TableCell>
                          <TableCell align="right">{pet.agility[0]}</TableCell>
                          <TableCell align="right">{pet.agility[1]}</TableCell>
                          <TableCell align="right">{pet.agility[2]}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Velocidad</TableCell>
                          <TableCell align="right">{pet.speed[0]}</TableCell>
                          <TableCell align="right">{pet.speed[1]}</TableCell>
                          <TableCell align="right">{pet.speed[2]}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>HP</TableCell>
                          <TableCell align="right">{pet.hp[0]}</TableCell>
                          <TableCell align="right">{pet.hp[1]}</TableCell>
                          <TableCell align="right">{pet.hp[2]}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Combo</TableCell>
                          <TableCell align="right">{pet.combo[0]}</TableCell>
                          <TableCell align="right">{pet.combo[1]}</TableCell>
                          <TableCell align="right">{pet.combo[2]}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Evasión</TableCell>
                          <TableCell align="right">{pet.evasion[0]}</TableCell>
                          <TableCell align="right">{pet.evasion[1]}</TableCell>
                          <TableCell align="right">{pet.evasion[2]}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Daño</TableCell>
                          <TableCell align="right">{pet.damage[0]}</TableCell>
                          <TableCell align="right">{pet.damage[1]}</TableCell>
                          <TableCell align="right">{pet.damage[2]}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ))}
            </Grid>
          </Grid>
        </Paper>
        {/* MODIFIERS SECTION */}
        <Paper
          id="modificadores"
          sx={{
            bgcolor: 'background.paperLight',
            mt: 2,
          }}
        >
          <Grid container spacing={2} sx={{ p: 2 }}>
            <Grid item xs={12}>
              <FantasyButton color="warning" sx={{ ml: 0 }}>
                <SportsKabaddi sx={{ verticalAlign: 'middle', mr: 1 }} />
                Modificadores Diarios
              </FantasyButton>
              <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>Modificadores Activos</Text>
              <Text body2>
                Estos modificadores pueden aparecer aleatoriamente cada día y
                afectan todas las peleas:
              </Text>
              <Divider sx={{ my: 2 }} />
              {DailyModifierOdds.filter((m) => (
                m.modifier !== FightModifier.chaos || m.odds > 0
              )).map(({ modifier }) => {
                const desc = t(`modifier.${modifier}.desc`);
                // Buscar el primer punto, signo de exclamación o interrogación
                // seguido de espacio y mayúscula o signo de exclamación invertido
                const match = desc.match(/[.!?]\s+([A-Z¡])/);
                let firstSentence = desc;
                let secondSentence = '';

                if (match && match.index !== undefined) {
                  const splitIndex = match.index;
                  firstSentence = desc.substring(0, splitIndex + 1);
                  // Extraer desde después del espacio (splitIndex + 2: signo + espacio)
                  secondSentence = desc.substring(splitIndex + 2);
                }

                return (
                  <Box key={modifier} sx={{ mb: 2 }}>
                    <Text h6 bold upperCase typo="LaBrute" color="secondary">
                      {t(`modifier.${modifier}`)}
                    </Text>
                    <Text body2>
                      {firstSentence}
                      {secondSentence && (
                        <Text component="span" bold>
                          {' '}{secondSentence}
                        </Text>
                      )}
                    </Text>
                  </Box>
                );
              })}
            </Grid>
          </Grid>
        </Paper>
        {/* CLANS EXPANDED SECTION */}
        <Paper
          id="clanes-expandida"
          sx={{
            bgcolor: 'background.paperLight',
            mt: 2,
          }}
        >
          <Grid container spacing={2} sx={{ p: 2 }}>
            <Grid item xs={12}>
              <FantasyButton color="warning" sx={{ ml: 0 }}>
                <Groups sx={{ verticalAlign: 'middle', mr: 1 }} />
                Clanes
              </FantasyButton>
              <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>Guerras de Clanes</Text>
              <Text body2>- Solo el master del clan puede declarar guerra</Text>
              <Text body2>- Duración: 7 días</Text>
              <Text body2>- Selección de {ClanWarMaxParticipants} luchadores por día</Text>
              <Text body2>- Recompensa: {ClanWarPointReward} puntos de clan para el ganador</Text>
              <Text body2>- Cambios de ELO según el resultado de la guerra</Text>
              <Text body2>- Guerras amistosas no dan recompensas ni cambios de ELO</Text>
              <Divider sx={{ my: 2 }} />
              <Text h5 bold upperCase typo="LaBrute" color="secondary">Jefes de Clanes (Bosses)</Text>
              <Text body2>- Derrotar a un jefe aumenta la capacidad del clan</Text>
              <Text body2>
                - Recompensas por derrotar: {BOSS_XP_REWARD} XP + {BOSS_GOLD_REWARD} oro
              </Text>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {bosses.map((boss) => (
                  <Grid item xs={12} sm={6} md={4} key={boss.name}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                          <Box
                            component="img"
                            src={`/images/pets/${boss.base === 'bear' ? 'bear' : boss.base === 'panther' ? 'panther' : 'dog'}.svg`}
                            sx={{
                              width: 80,
                              height: 80,
                              filter: 'drop-shadow(2px 2px 2px #000)',
                            }}
                          />
                        </Box>
                        <Text h6 bold upperCase typo="LaBrute" color="secondary" sx={{ textAlign: 'center', mb: 1 }}>
                          {boss.name === BossName.GoldClaw ? 'GoldClaw' : boss.name === BossName.EmberFang ? 'EmberFang' : 'Cerberus'}
                        </Text>
                        <Text body2>- Basado en: {t(boss.base)}</Text>
                        <Text body2>- HP: {boss.hp.toLocaleString()}</Text>
                        <Text body2>- Fuerza: {boss.strength}</Text>
                        <Text body2>- Agilidad: {boss.agility}</Text>
                        <Text body2>- Velocidad: {boss.speed}</Text>
                        <Text body2>- Alcance: {boss.reach}</Text>
                        <Text body2>- Cantidad: {boss.count}</Text>
                        <Text body2>- Recompensa: {boss.reward * 100}%</Text>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Text h5 bold upperCase typo="LaBrute" color="secondary">Miembros</Text>
              <Text body2>- Límite inicial: 10 miembros</Text>
              <Text body2>- Aumenta la capacidad derrotando jefes</Text>
              <Text body2>- Sistema de solicitudes de unión</Text>
              <Text body2>- El master puede aceptar o rechazar solicitudes</Text>
            </Grid>
          </Grid>
        </Paper>
        {/* WEAPONS SECTION */}
        <Paper
          id="armas"
          sx={{
            bgcolor: 'background.paperLight',
            mt: 2,
            mb: 4,
          }}
        >
          <Grid container spacing={2} sx={{ p: 2 }}>
            <Grid item xs={12}>
              <FantasyButton color="error" sx={{ ml: 0 }}>
                <Shield sx={{ verticalAlign: 'middle', mr: 1 }} />
                Armas
              </FantasyButton>
              <Text h5 bold upperCase typo="LaBrute" color="secondary" mt={1}>Tipos de Armas</Text>
              <Text body2>
                Las armas se clasifican en 6 tipos:{' '}
                {['fast', 'sharp', 'heavy', 'long', 'thrown', 'blunt']
                  .map((type) => t(type))
                  .join(', ')}
              </Text>
              <Divider sx={{ my: 2 }} />
              {(['fast', 'sharp', 'heavy', 'long', 'thrown', 'blunt'] as WeaponType[]).map((weaponType) => {
                const typeWeapons = Object.values(weapons).filter(
                  (w) => w.types.includes(weaponType),
                );
                if (typeWeapons.length === 0) return null;
                return (
                  <Box key={weaponType} sx={{ mb: 4 }}>
                    <Text h6 bold upperCase typo="LaBrute" color="secondary" mt={2} mb={2}>
                      {t(weaponType)}
                    </Text>
                    <Grid container spacing={2}>
                      {typeWeapons.map((weapon) => (
                        <Grid item xs={12} sm={6} md={4} key={weapon.name}>
                          <Card sx={{ height: '100%' }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                                <Box
                                  component="img"
                                  src={`/images/weapons/${weapon.name}.png`}
                                  sx={{
                                    width: 64,
                                    height: 64,
                                    filter: 'drop-shadow(2px 2px 2px #000)',
                                  }}
                                />
                              </Box>
                              <Text body2 bold sx={{ textAlign: 'center', mb: 1 }}>
                                {t(weapon.name)}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('odds')}: {weapon.odds}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('types')}: {weapon.types.map((type) => t(type)).join(', ')}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('reach')}: {weapon.reach}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('damage')} (T1/T2/T3): {weapon.damage[0]}/{weapon.damage[1]}/{weapon.damage[2]}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                Tempo: {weapon.tempo[0]}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('reversal')}: {weapon.reversal[0]}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('evasion')}: {weapon.evasion[0]}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('combo')}: {weapon.combo[0]}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('block')}: {weapon.block[0]}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('accuracy')}: {weapon.accuracy[0]}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                                {t('disarm')}: {weapon.disarm[0]}
                              </Text>
                              <Text body2 sx={{ fontSize: '0.75rem' }}>
                                {t('criticalChance')}: {weapon.criticalChance[0]}
                              </Text>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                );
              })}
            </Grid>
          </Grid>
        </Paper>
      </Box>
    </Page>
  );
};