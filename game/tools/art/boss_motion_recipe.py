"""Authored living drake motion on the frozen anatomical rest rig.

Angles are radians in each bone's authored local basis. The complete attack
clip is anticipation (0..3), release (3..5), recovery (5..7).
"""
import math
from mathutils import Matrix

def apply_pose(rig, clip, p):
    for bone in rig.pose.bones: bone.matrix_basis=Matrix.Identity(4)
    phase=p*2*math.pi
    if clip=='walk':
        rig.pose.bones['Body'].rotation_euler=(.035*math.sin(phase*2),.025*math.sin(phase),.04*math.sin(phase))
        rig.pose.bones['Neck'].rotation_euler=(.10*math.sin(phase),0,-.08*math.sin(phase))
        rig.pose.bones['Head'].rotation_euler=(-.05*math.sin(phase),0,.06*math.sin(phase))
        for side,sign in [('L',1),('R',-1)]:
            stride=.32*math.sin(phase)*sign
            rig.pose.bones['FrontLeg.'+side].rotation_euler=(stride,0,.05*sign*math.sin(phase))
            rig.pose.bones['BackLeg.'+side].rotation_euler=(-stride,0,0)
            rig.pose.bones['FrontFoot.'+side].rotation_euler=(-stride*.55,0,0)
            rig.pose.bones['BackFoot.'+side].rotation_euler=(stride*.55,0,0)
            rig.pose.bones['Wing.'+side].rotation_euler=(.10*math.sin(phase),sign*.22*math.sin(phase),sign*.06*math.cos(phase))
            rig.pose.bones['WingTip.'+side].rotation_euler=(0,-sign*.16*math.sin(phase-.5),0)
    else:
        # Explicit key poses make the body gather, spread its wings, strike and
        # follow through. Smooth interpolation is done by the production GPU.
        gather=[0,.34,.72,1,.35,-.32,-.13,0]
        spread=[0,.22,.65,1,.55,-.15,-.10,0]
        at=min(6,int(p*7));t=p*7-at
        power=gather[at]*(1-t)+gather[at+1]*t
        wing=spread[at]*(1-t)+spread[at+1]*t
        rig.pose.bones['Body'].rotation_euler=(-.16*power,.08*power,.10*power)
        rig.pose.bones['Neck'].rotation_euler=(-.52*power,.12*power,-.16*power)
        rig.pose.bones['Head'].rotation_euler=(.27*power,0,.12*power)
        for side,sign in [('L',1),('R',-1)]:
            rig.pose.bones['Wing.'+side].rotation_euler=(.23*wing,sign*.70*wing,sign*.12*wing)
            rig.pose.bones['WingTip.'+side].rotation_euler=(-.10*wing,-sign*.48*wing,0)
            rig.pose.bones['FrontLeg.'+side].rotation_euler=(.28*power,0,-sign*.10*power)
            rig.pose.bones['FrontFoot.'+side].rotation_euler=(-.21*power,0,0)
            rig.pose.bones['BackLeg.'+side].rotation_euler=(-.12*power,0,sign*.06*power)
            rig.pose.bones['BackFoot.'+side].rotation_euler=(.10*power,0,0)
    for i in range(1,6):
        rig.pose.bones['Tail'+str(i)].rotation_euler=(0,.04*math.sin(phase-i*.35),.13*math.sin(phase-i*.5))
