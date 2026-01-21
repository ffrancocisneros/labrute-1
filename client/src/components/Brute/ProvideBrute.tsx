import React, { useEffect } from 'react';
import { Outlet, useParams } from 'react-router';
import Server from '../../utils/Server';
import { useBrute } from '../../hooks/useBrute';
import { getCalculatedBrute, TemporarySkillEffect, TemporaryWeaponEffect } from '@labrute/core';
import { useAuth } from '../../hooks/useAuth';

/**
 * ProvideBrute component
 */
const ProvideBrute = () => {
  const { bruteName } = useParams();
  const { updateBrute } = useBrute();
  const { modifiers, user } = useAuth();

  // Fetch brute
  useEffect(() => {
    if (!bruteName) return;

    Server.Brute.getForHook(bruteName).then((data) => {
      const ownedBrute = user?.brutes.find((b) => (
        b.id === data.id || b.name.toLowerCase() === bruteName.toLowerCase()
      ));
      const calculated = getCalculatedBrute(data, modifiers);
      updateBrute({
        ...calculated,
        temporarySkills: (data.temporarySkills ?? ownedBrute?.temporarySkills ?? []) as TemporarySkillEffect[],
        temporaryWeapons: (data.temporaryWeapons ?? ownedBrute?.temporaryWeapons ?? []) as TemporaryWeaponEffect[],
      });
    }).catch(() => {
      window.location.href = '/unknown-brute';
    });
  }, [bruteName, updateBrute, modifiers, user]);
  return (
    <Outlet />
  );
};

export default ProvideBrute;
