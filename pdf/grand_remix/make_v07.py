from pathlib import Path
import shutil
root=Path(__file__).resolve().parent
s=(root/'build_plan_v06.py').read_text(encoding='utf-8')
changes={
"Grand_Remix_Plan_Technique_V06.pdf":"Grand_Remix_Plan_Technique_V07.pdf",
"V06":"V07",
"P1Y=SCREEN_Y-1.85":"P1Y=SCREEN_Y-1.85\nP1X=SW/2-.25-.08\nP1Z=3.00",
"top(-2.90,1.425)":"top(-3.90,1.425)",
"top(-2,2.35)":"top(-3,2.35)",
"top(SCREEN_X,P1Y)":"top(P1X,P1Y)",
"box(px-11,py-8,22,16,colors.white,VIOLET,1)":"box(px-.25*s,py-.25*s,.5*s,.5*s,colors.white,VIOLET,1)",
"tag(px+16,py-3,'P1'":"tag(px-32,py-3,'P1'",
"Centre : x = -2,00 ; y = +1,80. À mi-profondeur de scène.":"Centre : x = -3,00 ; y = +1,80. Bord de table à 37 cm du mur gauche. Trajet artiste par le fond puis côté centre.",
"Repère proposé x = +3,52 ; y = -1,85. Recul cible 1,85 m, marge incluse, à valider optiquement. P1 proche de la ventilation : encombrement et support à vérifier.":"Corps proposé x = +3,94 ; y = -1,85 ; z = +3,00 m. Décalage latéral +0,42 m du centre E1. Marge géométrique mur 8 cm ; refroidissement, optique et support non validés.",
"<b>P1 :</b> recul cible 1,85 m, soit +0,33 m par rapport au recul de la fiche. Marge souhaitée de +0,30 à +0,50 m, soumise à l’optique et au support. Dégagement de la ventilation à vérifier.":"<b>P1 :</b> corps à x +3,94 ; y -1,85 ; z +3,00 m. Boîtier indicatif 0,50 m de large : bord droit à +4,19 m. Marge mur 8 cm, géométrique seulement. Refroidissement, décentrement et support à valider.",
"front(-2.90,1.8,STAGE)":"front(-3.90,1.8,STAGE)",
"front(-2,1.8,STAGE+.4)":"front(-3,1.8,STAGE+.4)",
"side(SCREEN_X,P1Y,3.40)":"side(P1X,P1Y,P1Z)",
"line(px,py+7,px,sy+RH*ss,VIOLET,.7,(3,2))":"# Support deliberately unspecified pending DT validation.",
"P1 près de la ventilation : vérifier l’encombrement et le support.":"P1 : boîtier sous la ventilation, 8 cm de marge au mur dans la maquette. Refroidissement, décentrement et support à valider.",
"iso(-2.9,1.425,z)":"iso(-3.9,1.425,z)",
"iso(-1.1,1.425,z)":"iso(-2.1,1.425,z)",
"iso(-1.1,2.175,z)":"iso(-2.1,2.175,z)",
"iso(-2.9,2.175,z)":"iso(-3.9,2.175,z)",
"[(-2.9,1.425),(-1.1,1.425),(-1.1,2.175),(-2.9,2.175)]":"[(-3.9,1.425),(-2.1,1.425),(-2.1,2.175),(-3.9,2.175)]",
"iso(-2.4,1.7,STAGE+.5)":"iso(-3.4,1.7,STAGE+.5)",
"iso(SCREEN_X,P1Y,3.4)":"iso(P1X,P1Y,P1Z)",
"x +3,52 ; y -1,85 ; recul cible 1,85 m":"x +3,94 ; y -1,85 ; z +3,00 m",
"Marge incluse : +0,33 m par rapport à la fiche. Optique et ventilation à vérifier.":"Marge mur 8 cm dans la maquette ; optique, refroidissement et support à valider.",
"DJ : x -2,00 ; y +1,80.":"DJ : x -3,00 ; y +1,80.",
"Table 1,80 x 0,75 m proposée ; passage central dégagé.":"Table 1,80 x 0,75 m ; mur gauche à 37 cm. Passage artiste derrière puis côté centre.",
}
for old,new in changes.items():
    assert old in s,old
    s=s.replace(old,new)
# Explicit proposed route, separate from existing LX.
s=s.replace("# Current régie shown schematically", "for a,b in zip([(-3.36,3.22),(-1.65,3.22),(-1.65,.55)],[(-1.65,3.22),(-1.65,.55),(.23,.55)]):\n    arrow(*top(*a),*top(*b),TEAL,.8,(4,2),4)\n# Current régie shown schematically")
(root/'build_plan_v07.py').write_text(s,encoding='utf-8')
exec(compile(s,str(root/'build_plan_v07.py'),'exec'))
shutil.copy2(root/'Grand_Remix_Plan_Technique_V07.pdf', root.parents[1]/'grand-remix-3d'/'PLAN_AVANT_CORRIGE.pdf')
