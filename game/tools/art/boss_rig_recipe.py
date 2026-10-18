"""Anatomical drake rest chains, fitted against the original asymmetric sculpt."""
REFERENCE_SCALE=.9409755579916803
SOURCE_OFFSET=(-.035811680128072065,.007411276051559029,.011767483485094044)
def source(point):return tuple((point[i]+SOURCE_OFFSET[i])/REFERENCE_SCALE for i in range(3))
DISPLAY_BONES=[
 ('Body',(-.05,.20,1.65),(-.50,-.35,2.45),None),
 ('Neck',(-.50,-.35,2.45),(-.95,-.80,3.15),'Body'),
 ('Head',(-.95,-.80,3.15),(-1.30,-1.20,3.85),'Neck'),
 ('Tail1',(.65,.65,1.35),(1.35,.80,.65),'Body'),
 ('Tail2',(1.35,.80,.65),(1.80,.05,.30),'Tail1'),
 ('Tail3',(1.80,.05,.30),(1.35,-1.05,.22),'Tail2'),
 ('Tail4',(1.35,-1.05,.22),(.50,-1.80,.17),'Tail3'),
 ('Tail5',(.50,-1.80,.17),(-.65,-1.55,.15),'Tail4'),
 ('FrontLeg.L',(-.25,-.55,1.80),(-.55,-.85,.75),'Body'),
 ('FrontFoot.L',(-.55,-.85,.75),(-.80,-1.30,.11),'FrontLeg.L'),
 ('BackLeg.L',(.65,.55,1.65),(.70,.15,.75),'Body'),
 ('BackFoot.L',(.70,.15,.75),(.85,-.10,.12),'BackLeg.L'),
 ('Wing.L',(.15,.20,2.20),(.60,.45,3.60),'Body'),
 ('WingTip.L',(.60,.45,3.60),(1.60,.95,1.35),'Wing.L'),
 ('FrontLeg.R',(-.95,-.35,1.75),(-1.15,-.65,.70),'Body'),
 ('FrontFoot.R',(-1.15,-.65,.70),(-1.65,-.90,.11),'FrontLeg.R'),
 ('BackLeg.R',(.05,.65,1.55),(.25,.60,.65),'Body'),
 ('BackFoot.R',(.25,.60,.65),(.30,.35,.10),'BackLeg.R'),
 ('Wing.R',(-.40,.20,2.35),(-.85,.65,4.05),'Body'),
 ('WingTip.R',(-.85,.65,4.05),(-2.00,.95,1.65),'Wing.R')]
REST_BONES=[(name,source(head),source(tail),parent) for name,head,tail,parent in DISPLAY_BONES]
