import { useRef, useEffect } from 'react';

/**
 * Hook personnalisé pour suivre pourquoi un composant React est rendu
 * @param {string} componentName - Nom du composant (pour faciliter l'identification dans la console)
 * @param {Object} props - Props du composant
 * @param {Array} dependencies - Tableau de dépendances à surveiller (comme pour useEffect)
 * @param {Object} state - État du composant à surveiller (optionnel)
 */
const useLogger = (componentName: string, props: Object) => {
  // Référence aux props et état précédents
  const prevPropsRef = useRef(props);
  const renderCountRef = useRef(0);

  useEffect(() => {
    // Premier rendu
    if (renderCountRef.current === 0) {
      console.log(`[${componentName}] Premier rendu`);
      renderCountRef.current++;
      prevPropsRef.current = props;
      return;
    }

    // Incrémenter le compteur de rendu
    renderCountRef.current++;

    // Vérifier les changements dans les props
    const prevProps = prevPropsRef.current;
    const propsChanges = Object.keys(props).filter((key) => prevProps[key] !== props[key]);

    if (propsChanges.length > 0) {
      console.log(
        `[${componentName}] Rendu #${renderCountRef.current} causé par changement de props:`,
        propsChanges.reduce((acc, key) => {
          acc[key] = {
            de: prevProps[key],
            vers: props[key],
          };
          return acc;
        }, {})
      );
    }

    // Si aucun changement détecté mais composant rendu quand même
    if (propsChanges.length === 0) {
      console.log(
        `[${componentName}] Rendu #${renderCountRef.current} - Aucun changement détecté, possible rendu parent`
      );
    }

    // Mettre à jour les références
    prevPropsRef.current = props;
  });
};

export default useLogger;
