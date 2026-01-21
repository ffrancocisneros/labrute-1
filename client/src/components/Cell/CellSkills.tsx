import { skillList } from '@labrute/core';
import { SkillName } from '@labrute/prisma';
import { Box, Grid, PaperProps } from '@mui/material';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import { useBrute } from '../../hooks/useBrute';
import { PerkColor } from '../../utils/StatColor';
import SkillTooltip from '../Brute/SkillTooltip';
import { TierStar } from '../Brute/TierStar';

const CellSkills = ({
  sx,
  selectCallback,
  hoverSelectAscend = false,
  selectedSkill = null,
  ...props
}: PaperProps & {
  selectCallback?: (skill: SkillName) => void,
  hoverSelectAscend?: boolean,
  selectedSkill?: SkillName | null,
}) => {
  const { brute } = useBrute();

  const [hoveredSkill, setHoveredSkill] = useState<SkillName | null>(null);

  const randomSkill = useMemo(
    () => (brute && !hoverSelectAscend ? brute.randomSkill : null),
    [brute, hoverSelectAscend]
  );

  const getFilter = (skill: SkillName) => {
    if (randomSkill === skill) return `drop-shadow(0 0 0.5rem ${PerkColor.Random})`;
    if (brute?.ascendedSkills.includes(skill)
      || selectedSkill === skill
      || (hoverSelectAscend && hoveredSkill === skill && brute?.skills[skill])) return `drop-shadow(0 0 0.5rem ${PerkColor.Ascended})`;
    return 'none';
  };

  const onSkillClick = (clicked: SkillName) => () => {
    if (selectCallback === undefined) {
      return;
    }
    if (!brute?.skills[clicked]) {
      return;
    }
    selectCallback(clicked);
  };

  return brute && (
    <Grid container spacing={1} sx={{ pt: 1, ...sx }} {...props}>
      {skillList.map((skill) => {
        type TempSkill = { skillName: SkillName; expiresAt: string };
        const bruteWithTemps = brute as unknown as {
          temporarySkills?: TempSkill[];
        };
        const tempSkills: TempSkill[] = bruteWithTemps?.temporarySkills ?? [];
        const tempForSkill = tempSkills.filter((temp) => temp.skillName === skill.name);
        const tempCount = tempForSkill.length;
        const baseTier = brute.skills[skill.name] ?? 0;
        const tier = baseTier + tempCount;
        const hasSkill = tier > 0;

        const remainingText = (() => {
          if (!tempCount) return undefined;
          const now = dayjs();
          const soonest = tempForSkill
            .map((temp) => dayjs(temp.expiresAt))
            .sort((a, b) => a.valueOf() - b.valueOf())[0];
          if (!soonest) return undefined;
          const totalMinutes = Math.max(0, soonest.diff(now, 'minute'));
          const hours = Math.floor(totalMinutes / 60);
          const minutes = totalMinutes % 60;
          return `Tiempo restante: ${hours}h ${minutes}m`;
        })();

        return (
          <Grid
            item
            xs={12 / 7}
            key={skill.name}
            sx={{
              opacity: hasSkill
                ? 1
                : 0.4,
              position: 'relative',
            }}
            onClick={onSkillClick(skill.name)}
            onMouseEnter={() => setHoveredSkill(skill.name)}
            onMouseLeave={() => setHoveredSkill(null)}
          >
            <SkillTooltip skill={skill} tier={tier || 1} remainingText={remainingText}>
              <Box
                component="img"
                src={`/images/skills/${skill.name}.svg`}
                sx={{
                  boxShadow: 4,
                  filter: getFilter(skill.name),
                  border: tempCount ? '2px solid' : 'none',
                  borderColor: tempCount ? 'error.main' : 'transparent',
                  cursor: (hoverSelectAscend && hasSkill) ? 'pointer' : 'default',
                  transition: 'filter 0.3s',
                }}
              />
            </SkillTooltip>
            {tier > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: -4,
                }}
              >
                {Array.from({ length: tier - 1 }).map((_, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <TierStar key={index} />
                ))}
              </Box>
            )}
          </Grid>
        );
      })}
    </Grid>
  );
};

export default CellSkills;
