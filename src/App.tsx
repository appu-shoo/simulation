import React, { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Text, 
  Line as ThreeLine, 
  Html,
  Environment,
  ContactShadows
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  Zap, 
  Camera as CameraIcon, 
  Waves, 
  Radio, 
  Binary,
  Settings,
  Info,
  Layers,
  Cpu,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

const COLORS = {
  power: '#ff4444', // power
  ground: '#000000', // gnd
  data: '#facc15', // data
  pwm: '#3b82f6',   // pwm
  highlight: '#66fcf1', // accent
  background: '#0b0c10', // bg
  node: '#1f2833', // card
  dim: '#45a29e'  // dim
};

const BINS = [
  { id: 'metal', color: '#6b7280', label: 'METAL', icon: Radio, targetX: -3 },
  { id: 'wet', color: '#22c55e', label: 'WET', icon: Waves, targetX: -1.5 },
  { id: 'plastic', color: '#3b82f6', label: 'PLASTIC', icon: Cpu, targetX: 0 },
  { id: 'ewaste', color: '#eab308', label: 'E-WASTE', icon: Monitor, targetX: 1.5 },
  { id: 'dry', color: '#78350f', label: 'DRY/OTHER', icon: Info, targetX: 3 }
];

const CATEGORIES = [
  { id: 'metal', name: 'Metal', sensor: 'Inductive', logic: 'Inductive High → Ch 0 (90°)', description: 'Detects metallic objects using electromagnetic induction.', gpio: '27', channel: '0' },
  { id: 'wet', name: 'Wet', sensor: 'Moisture', logic: 'Moisture High → Ch 1 (90°)', description: 'Measures electrical conductivity to identify organic/wet waste.', gpio: '22', channel: '1' },
  { id: 'plastic', name: 'Plastic', sensor: 'AI Camera', logic: 'AI Identify → Ch 2 (90°)', description: 'Uses computer vision models to identify plastic resins.', gpio: 'CSI', channel: '2' },
  { id: 'ewaste', name: 'E-Waste', sensor: 'AI Camera', logic: 'AI Identify → Ch 3 (90°)', description: 'Object detection for circuit boards and electronic scrap.', gpio: 'CSI', channel: '3' },
  { id: 'dry', name: 'Dry/Other', sensor: 'Dry/Other', logic: 'Default → Ch 4 (90°)', description: 'Standard fallback for non-classified dry materials.', gpio: 'Internal', channel: '4' }
];

// --- Schematic Component ---

const BlueprintBox = ({ children, title, className = "" }: { children: React.ReactNode, title: string, className?: string }) => (
  <div className={`relative border-2 border-dashed border-[#45a29e]/40 p-6 rounded-lg bg-black/60 shadow-[0_0_30px_rgba(102,252,241,0.05)] ${className}`}>
    <div className="absolute -top-3 left-4 bg-[#0b0c10] px-3 text-[11px] font-black tracking-[0.2em] text-[#66fcf1] border-x border-[#66fcf1]/30">
      {title}
    </div>
    {children}
  </div>
);

const Pin = ({ label, number, color = "#45a29e", side = "left" }: { label: string, number?: string, color?: string, side?: "left" | "right" }) => (
  <div className={`flex items-center gap-3 py-1 group ${side === "right" ? "flex-row-reverse" : ""}`}>
    <div 
      className="w-2 h-2 rounded-full border-2 transition-all group-hover:scale-125" 
      style={{ borderColor: color, backgroundColor: 'transparent' }} 
    />
    <span 
      className={`text-[10px] opacity-80 min-w-[60px] ${side === "right" ? "text-right" : ""}`}
      style={{ color }}
    >
      {label}
    </span>
    {number && <span className="text-[9px] text-[#c5c6c7]/40 font-mono">[{number}]</span>}
  </div>
);

const TechnicalSchematic = () => {
  return (
    <div className="w-full h-full bg-[#0b0c10] overflow-auto p-12 flex justify-center items-start font-mono bg-[linear-gradient(rgba(69,162,158,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(69,162,158,0.05)_1px,transparent_1px)] bg-[size:40px_40px]">
      <div className="relative flex flex-col gap-16 items-center min-w-[1000px] border border-[#45a29e]/20 p-12 rounded-2xl bg-black/40">
        
        {/* Layer A: Input */}
        <BlueprintBox title="LAYER A: INPUT (SENSORS)" className="w-full">
          <div className="flex justify-around gap-8">
            <div className="flex flex-col items-center p-4 bg-black/40 border border-white/5 rounded">
              <Radio size={24} className="text-[#66fcf1] mb-2" />
              <div className="text-[10px] text-white">IR SENSOR</div>
              <div className="text-[8px] text-[#45a29e]">(GPIO17)</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-black/40 border border-white/5 rounded">
              <Zap size={24} className="text-[#66fcf1] mb-2" />
              <div className="text-[10px] text-white">INDUCTIVE PROXIMITY</div>
              <div className="text-[8px] text-[#45a29e]">(GPIO27)</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-black/40 border border-white/5 rounded">
              <Waves size={24} className="text-[#66fcf1] mb-2" />
              <div className="text-[10px] text-white">MOISTURE SENSOR</div>
              <div className="text-[8px] text-[#45a29e]">(GPIO22)</div>
            </div>
            <div className="flex flex-col items-center p-4 bg-black/40 border border-white/5 rounded">
              <CameraIcon size={24} className="text-[#66fcf1] mb-2" />
              <div className="text-[10px] text-white">CAMERA</div>
              <div className="text-[8px] text-[#45a29e]">(CSI PORT)</div>
            </div>
          </div>
        </BlueprintBox>

        <div className="flex gap-12 w-full justify-center">
          {/* Layer B: Brain */}
          <BlueprintBox title="LAYER B: BRAIN (RASPBERRY PI 4)" className="w-[400px]">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-[#ff4444] text-[9px]">PIN 1 (3.3V)</span>
                <span className="text-[#45a29e] text-[9px]">→ PCA9685 VCC</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-[#facc15] text-[9px]">PIN 3 (SDA)</span>
                <span className="text-[#45a29e] text-[9px]">→ PCA9685 SDA</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-[#facc15] text-[9px]">PIN 5 (SCL)</span>
                <span className="text-[#45a29e] text-[9px]">→ PCA9685 SCL</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1">
                <span className="text-[#c5c6c7] text-[9px]">PIN 9 (GND)</span>
                <span className="text-[#45a29e] text-[9px]">→ PCA9685 GND</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="bg-[#66fcf1]/5 p-2 rounded border border-[#66fcf1]/20">
                  <div className="text-[8px] text-[#66fcf1]">GPIO17</div>
                  <div className="text-[7px] opacity-50">IR Arrival</div>
                </div>
                <div className="bg-[#66fcf1]/5 p-2 rounded border border-[#66fcf1]/20">
                  <div className="text-[8px] text-[#66fcf1]">GPIO27</div>
                  <div className="text-[7px] opacity-50">Metal Sensor</div>
                </div>
              </div>
            </div>
          </BlueprintBox>

          <div className="flex flex-col gap-4">
            <BlueprintBox title="SERVO DRIVER (PCA9685)" className="w-[250px]">
              <div className="text-[8px] text-[#45a29e] mb-2">I2C INTERFACE</div>
              <div className="space-y-1">
                <div className="h-1.5 w-full bg-[#3b82f6]/20 rounded" />
                <div className="h-1.5 w-full bg-[#3b82f6]/20 rounded" />
                <div className="h-1.5 w-full bg-[#333] rounded" />
              </div>
              <div className="mt-4 text-[9px] text-[#ff4444]">V+ POWER (5V EXT)</div>
            </BlueprintBox>

            <BlueprintBox title="EXTERNAL PSU" className="w-[250px] border-solid border-[#ff4444]/30">
              <div className="flex items-center gap-3">
                <Zap size={20} className="text-[#ff4444]" />
                <div>
                  <div className="text-[10px] text-white">5V 10A DC</div>
                  <div className="text-[8px] text-[#45a29e]">HIGH CURRENT RAIL</div>
                </div>
              </div>
            </BlueprintBox>
          </div>
        </div>

        {/* Layer C: Output */}
        <BlueprintBox title="LAYER C: OUTPUT (ACTUATORS - SERVO MOTORS)" className="w-full">
          <div className="flex justify-around gap-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex flex-col items-center p-3 bg-black/40 border border-white/5 rounded w-32">
                <Settings size={18} className="text-[#3b82f6] mb-2 animate-spin-slow" />
                <div className="text-[9px] text-white font-bold uppercase transition-colors">Servo {i}</div>
                <div className="text-[7px] text-[#3b82f6]">CH {i-1} (PWM)</div>
              </div>
            ))}
          </div>
        </BlueprintBox>

      </div>
      
      {/* Legend */}
      <div className="fixed bottom-12 left-12 bg-black/80 border border-[#45a29e]/30 p-4 rounded-lg">
        <div className="text-[9px] font-bold text-[#66fcf1] mb-3 tracking-widest uppercase">Wiring Legend</div>
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="w-8 h-1 bg-[#ff4444]" />
            <span className="text-[8px] text-[#c5c6c7]">+5V / 3.3V POWER</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-1 bg-black border border-white/20" />
            <span className="text-[8px] text-[#c5c6c7]">GND (GROUND)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-1 bg-[#facc15]" />
            <span className="text-[8px] text-[#c5c6c7]">DATA / SIGNAL</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-1 bg-[#3b82f6]" />
            <span className="text-[8px] text-[#c5c6c7]">PWM SIGNAL (SERVOS)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Subcomponents ---

const PanelTitle = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[10px] uppercase font-bold tracking-widest text-[#45a29e] border-l-2 border-[#66fcf1] pl-2 mb-3">
    {children}
  </div>
);

const WiringPanel = () => (
  <div className="bg-[#1f2833] border border-white/5 rounded-lg p-4 h-full flex flex-col gap-6 overflow-y-auto">
    <div>
      <PanelTitle>PI TO PCA9685 (I2C)</PanelTitle>
      <table className="w-full text-left font-mono text-[10px]">
        <thead>
          <tr className="text-[#45a29e] border-b border-white/5">
            <th className="pb-2">SIGNAL</th>
            <th className="pb-2 text-center">PI PIN</th>
            <th className="pb-2 text-right">PCA9685</th>
          </tr>
        </thead>
        <tbody className="text-[#c5c6c7]">
          <tr className="border-b border-white/5">
            <td className="py-2 text-[#ff4444]">VCC (3.3V)</td>
            <td className="py-2 text-center text-[#ff4444]">Pin 1</td>
            <td className="py-2 text-right text-[#ff4444]">VCC</td>
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 text-[#facc15]">SDA</td>
            <td className="py-2 text-center text-[#facc15]">Pin 3</td>
            <td className="py-2 text-right text-[#facc15]">SDA</td>
          </tr>
          <tr className="border-b border-white/5">
            <td className="py-2 text-[#facc15]">SCL</td>
            <td className="py-2 text-center text-[#facc15]">Pin 5</td>
            <td className="py-2 text-right text-[#facc15]">SCL</td>
          </tr>
          <tr>
            <td className="py-2 opacity-60">GND</td>
            <td className="py-2 text-center opacity-60">Pin 9</td>
            <td className="py-2 text-right opacity-60">GND</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div>
      <PanelTitle>GPIO INPUT CONFIG</PanelTitle>
      <table className="w-full text-left font-mono text-[10px]">
        <thead>
          <tr className="text-[#45a29e] border-b border-white/5">
            <th className="pb-2">SENSOR</th>
            <th className="pb-2 text-center">GPIO</th>
            <th className="pb-2 text-right">PROTECT</th>
          </tr>
        </thead>
        <tbody className="text-[#c5c6c7]">
          <tr className="border-b border-white/5">
            <td>Inductive</td>
            <td className="text-center">27</td>
            <td className="text-right">10kΩ</td>
          </tr>
          <tr className="border-b border-white/5">
            <td>IR Sensor</td>
            <td className="text-center">17</td>
            <td className="text-right">Direct</td>
          </tr>
          <tr className="border-b border-white/5">
            <td>Moisture</td>
            <td className="text-center">22</td>
            <td className="text-right">Direct</td>
          </tr>
          <tr>
            <td>Camera</td>
            <td className="text-center">CSI</td>
            <td className="text-right">Ribbon</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="mt-auto flex gap-4 border-t border-white/5 pt-4">
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-[#45a29e]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#ff4444]" /> PWR
      </div>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-[#45a29e]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#facc15]" /> DATA
      </div>
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-tighter text-[#45a29e]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" /> PWM
      </div>
    </div>
  </div>
);

const LogicMap = ({ onSimulate }: { onSimulate: (id: string) => void }) => (
  <div className="grid grid-cols-5 gap-3">
    {CATEGORIES.map((cat, i) => (
      <button 
        key={cat.id}
        onClick={() => onSimulate(cat.id)}
        className="bg-[#1f2833]/50 border border-white/10 p-3 rounded text-left hover:border-[#66fcf1]/50 hover:bg-[#1f2833] transition-all group"
      >
        <div className="text-[9px] font-mono text-[#45a29e] mb-1">0{i+1}. {cat.id.toUpperCase()}</div>
        <h4 className="text-[11px] font-bold text-[#66fcf1] mb-1 group-hover:translate-x-1 transition-transform">{cat.name}</h4>
        <p className="text-[9px] text-[#c5c6c7] opacity-60 line-clamp-1">{cat.logic}</p>
      </button>
    ))}
  </div>
);

// --- Main Components ---

const WasteItem = ({ categoryId, onComplete }: { categoryId: string, onComplete: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [progress, setProgress] = useState(0);
  const targetBin = BINS.find(b => b.id === categoryId);

  useFrame((state, delta) => {
    if (progress < 1) {
      setProgress(p => Math.min(1, p + delta * 0.5));
    } else {
      onComplete();
    }
  });

  const position = useMemo(() => {
    if (!targetBin) return new THREE.Vector3(0, 5, -1);
    
    const t = progress;
    if (t < 0.5) {
      // Slidng down the upper ramp part (0 to 0.5)
      const rt = t / 0.5;
      return new THREE.Vector3(0, 4 - rt * 3, -1 - rt * 1.5);
    } else {
      // Falling from bottom of ramp into bin (0.5 to 1.0)
      const ft = (t - 0.5) / 0.5;
      const startX = 0;
      const startY = 1;
      const startZ = -2.5;
      
      // Horizontal movement + Vertical arc
      const arcY = Math.sin(ft * Math.PI) * 0.8;
      return new THREE.Vector3(
        startX + (targetBin.targetX - startX) * ft,
        startY - ft * 5 + arcY,
        startZ + ft * 5
      );
    }
  }, [progress, targetBin]);

  const scale = progress < 0.95 ? 1 : 1 - (progress - 0.95) * 20;

  return (
    <mesh position={position} castShadow scale={[scale, scale, scale]}>
      {categoryId === 'plastic' ? (
        <cylinderGeometry args={[0.15, 0.15, 0.4]} />
      ) : categoryId === 'metal' ? (
        <boxGeometry args={[0.3, 0.3, 0.3]} />
      ) : (
        <sphereGeometry args={[0.18, 16, 16]} />
      )}
      <meshStandardMaterial 
        color={targetBin?.color || '#fff'} 
        emissive={targetBin?.color || '#fff'} 
        emissiveIntensity={0.6} 
      />
    </mesh>
  );
};

const Bin = ({ position, color, label, icon: Icon }: { position: [number, number, number], color: string, label: string, icon: any }) => (
  <group position={position}>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[1.3, 1.8, 1.3]} />
      <meshStandardMaterial color={color} roughness={0.6} metalness={0.1} />
    </mesh>
    {/* Inside shadow */}
    <mesh position={[0, 0.9, 0]}>
      <boxGeometry args={[1.1, 0.05, 1.1]} />
      <meshStandardMaterial color="#000" />
    </mesh>
    {/* Label Plate */}
    <mesh position={[0, -0.4, 0.66]}>
      <planeGeometry args={[1, 0.4]} />
      <meshStandardMaterial color="#ffffff" opacity={0.1} transparent />
    </mesh>
    <Text
      position={[0, -0.4, 0.67]}
      fontSize={0.12}
      color="white"
    >
      {label}
    </Text>
    <group position={[0, 0, 0.67]}>
       {/* Small icon representation using simple relative meshes if icon component fails in 3D */}
       <mesh>
         <sphereGeometry args={[0.05, 8, 8]} />
         <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
       </mesh>
    </group>
  </group>
);

const SegregatorStructure = () => (
  <group>
    {/* Base Plate */}
    <mesh position={[0, -5.2, 0]} receiveShadow>
      <boxGeometry args={[12, 0.2, 6]} />
      <meshStandardMaterial color="#1f1f1f" />
    </mesh>

    {/* Main Ramp Structure */}
    <mesh position={[0, 0, -1]} rotation={[-Math.PI / 4, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[3, 10, 0.2]} />
      <meshStandardMaterial color="#2d2d2d" />
    </mesh>
    
    {/* Side Walls of Ramp */}
    <mesh position={[-1.6, 0, -1]} rotation={[-Math.PI / 4, 0, 0]}>
      <boxGeometry args={[0.2, 10, 0.8]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
    <mesh position={[1.6, 0, -1]} rotation={[-Math.PI / 4, 0, 0]}>
      <boxGeometry args={[0.2, 10, 0.8]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>

    {/* Head Unit (Camera/AI) */}
    <group position={[0, 4, -1]}>
      <mesh castShadow>
        <boxGeometry args={[4, 2, 3]} />
        <meshStandardMaterial color="#3a3a3a" />
      </mesh>
      {/* Camera Lens */}
      <mesh position={[0, 0, 1.5]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#000" roughness={0} metalness={1} />
      </mesh>
      <Text position={[0, 1.2, 0]} fontSize={0.2} color="#66fcf1" anchorY="bottom">
        AI VISION SYSTEM
      </Text>
    </group>

    {/* Control Box on Side */}
    <group position={[3, 1, -1]}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 3, 2]} />
        <meshStandardMaterial color="#1f2833" transparent opacity={0.8} />
      </mesh>
      <Text rotation={[0, Math.PI / 2, 0]} position={[0.3, 0, 0]} fontSize={0.15} color="#facc15">
        BRAIN // PI + PWM
      </Text>
    </group>
  </group>
);

const ComponentBox = ({ position, label, color = COLORS.node, icon: Icon, onClick }: any) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <group position={position} onClick={onClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.6, 0.3]} />
        <meshStandardMaterial color={hovered ? '#45a29e' : color} roughness={0.1} metalness={0.8} />
      </mesh>
      <Text
        position={[0, 0, 0.2]}
        fontSize={0.1}
        color={hovered ? "white" : "#c5c6c7"}
      >
        {label}
      </Text>
      <Html position={[0, 0.4, 0]} center>
         <div className={`p-1 rounded bg-[#1f2833]/80 border border-[#45a29e]/30 pointer-events-none transition-transform ${hovered ? 'scale-110 border-[#66fcf1]' : 'scale-100'}`}>
            {Icon && <Icon size={10} className={hovered ? "text-[#66fcf1]" : "text-[#45a29e]"} />}
         </div>
      </Html>
    </group>
  );
};

const RaspberryPi = ({ position }: any) => {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 0.1]} />
        <meshStandardMaterial color="#145a32" roughness={0.2} metalness={0.3} />
      </mesh>
      {/* CPU */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[0.5, 0.2, 0.5]} />
        <meshStandardMaterial color="#333" metalness={1} />
      </mesh>
      {/* Ports */}
      <mesh position={[0.8, 0.2, 0]}>
        <boxGeometry args={[0.4, 0.4, 1]} />
        <meshStandardMaterial color="#c5c6c7" />
      </mesh>
      <Text position={[0, 0.4, 0]} fontSize={0.12} color="#66fcf1" anchorY="bottom">
        RPI 4B
      </Text>
    </group>
  );
};

const Servo = ({ position, active, label }: any) => {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (active && meshRef.current) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, Math.PI / 2, 0.1);
    } else if (meshRef.current) {
      meshRef.current.rotation.y = THREE.MathUtils.lerp(meshRef.current.rotation.y, 0, 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[0.8, 1, 0.8]} />
        <meshStandardMaterial color="#1f2833" />
      </mesh>
      <mesh position={[0, 0, 0]} scale={[1.05, 1.05, 1.05]}>
        <boxGeometry args={[0.8, 1, 0.8]} />
        <meshBasicMaterial color="#66fcf1" transparent opacity={0.05} />
      </mesh>
      <group ref={meshRef} position={[0, 0.4, 0]}>
        <mesh position={[0, 0.1, 0.3]}>
          <boxGeometry args={[1.2, 0.1, 0.2]} />
          <meshStandardMaterial color="#c5c6c7" />
        </mesh>
      </group>
      <Text position={[0, -0.8, 0]} fontSize={0.12} color="#45a29e">
        {label}
      </Text>
    </group>
  );
};

const DataPulse = ({ points, color, speed = 1, onComplete }: { points: THREE.Vector3[], color: string, speed?: number, onComplete?: () => void }) => {
  const [progress, setProgress] = useState(0);
  const totalSteps = points.length - 1;

  useFrame((state, delta) => {
    if (progress < totalSteps) {
      const nextProgress = progress + delta * speed;
      if (nextProgress >= totalSteps) {
        setProgress(totalSteps);
        onComplete?.();
      } else {
        setProgress(nextProgress);
      }
    }
  });

  const segments = useMemo(() => {
    const p = Math.floor(progress);
    const subProgress = progress - p;
    if (p >= totalSteps) return points[totalSteps];
    
    return new THREE.Vector3().lerpVectors(points[p], points[p + 1], subProgress);
  }, [progress, points, totalSteps]);

  return (
    <mesh position={[segments.x, segments.y, segments.z]}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={color} />
      <pointLight color={color} intensity={0.5} distance={1} />
    </mesh>
  );
};

// --- Main Application ---

export default function App() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [viewMode, setViewMode] = useState<'3D' | 'SCHEMATIC'>('3D');

  const startSimulation = (categoryId: string) => {
    if (isSimulating) return;
    setActiveCategory(categoryId);
    setIsSimulating(true);
    
    // Play sound or haptic feedback "feel" via animation duration
    setTimeout(() => {
      setIsSimulating(false);
      setActiveCategory(null);
    }, 3000);
  };

  const triggerRandom = () => {
    const randomCat = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    startSimulation(randomCat.id);
  };

  const cablePaths = useMemo(() => {
    return CATEGORIES.reduce((acc: any, cat, idx) => {
      const sensorX = -4 + idx * 2.5;
      const sensorPos = new THREE.Vector3(sensorX + 1, 5, 0);
      const piInputPos = new THREE.Vector3(-0.8 + (idx * 0.15), 0.1, idx % 2 === 0 ? 0.4 : -0.4);
      const piOutputPos = new THREE.Vector3(0.5, 0.1, 0.5);
      const servoPos = new THREE.Vector3(sensorX + 1, -5, 0);

      acc[cat.id] = {
        sensorToPi: [sensorPos, new THREE.Vector3(sensorX + 1, 2, 0), new THREE.Vector3(-0.8, 2, 0.5), piInputPos],
        piToServo: [piOutputPos, new THREE.Vector3(0.5, -2, 0.5), new THREE.Vector3(sensorX + 1, -2, 0), servoPos]
      };
      return acc;
    }, {});
  }, []);

  return (
    <div className="h-screen w-full bg-[#0b0c10] text-[#c5c6c7] p-6 flex flex-col gap-5 overflow-hidden select-none font-sans">
      {/* Header */}
      <header className="flex justify-between items-end border-b border-[#45a29e] pb-3">
        <div className="flex items-center gap-6 text-white">
          <div>
            <h1 className="text-xl font-bold tracking-[0.2em] text-[#66fcf1] uppercase">5-Category Waste Segregator</h1>
            <p className="text-[10px] text-[#45a29e] font-mono tracking-wider">3D CIRCUIT ARCHITECTURE & LOGIC FLOW</p>
          </div>
          
          <div className="flex bg-[#1f2833] p-1 rounded border border-white/5">
            <button 
              onClick={() => setViewMode('3D')}
              className={`flex items-center gap-2 px-3 py-1 rounded transition-all text-[10px] font-bold ${viewMode === '3D' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-[#45a29e] hover:text-[#c5c6c7]'}`}
            >
              <Cpu size={12} /> 3D FLOW
            </button>
            <button 
              onClick={() => setViewMode('SCHEMATIC')}
              className={`flex items-center gap-2 px-3 py-1 rounded transition-all text-[10px] font-bold ${viewMode === 'SCHEMATIC' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'text-[#45a29e] hover:text-[#c5c6c7]'}`}
            >
              <Layers size={12} /> SCHEMATIC
            </button>
          </div>
        </div>
        
        <div className="font-mono text-[10px] bg-[#66fcf1]/10 px-3 py-1 border border-[#66fcf1] rounded text-[#66fcf1] tracking-widest flex items-center gap-4">
          <button 
            onClick={triggerRandom}
            disabled={isSimulating}
            className={`px-2 py-0.5 rounded bg-[#66fcf1] text-[#0b0c10] font-black hover:opacity-80 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2`}
          >
            <Zap size={10} fill="currentColor" /> TEST_TRIGGER
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full bg-[#66fcf1] ${isSimulating ? 'animate-ping' : 'animate-pulse'}`} />
            {isSimulating ? 'SIMULATING_FLOW...' : 'SYSTEM_READY // I2C_IDLE'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {viewMode === '3D' ? (
            <motion.div 
              key="3d" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="h-full w-full grid grid-cols-[300px_1fr] gap-5"
            >
              <WiringPanel />
              
              <div className="relative bg-black border border-[#45a29e]/30 rounded-xl overflow-hidden group">
                <Canvas shadows gl={{ antialias: true, alpha: false }} dpr={[1, 2]}>
                  <color attach="background" args={['#0b0c10']} />
                  <PerspectiveCamera makeDefault position={[8, 4, 12]} fov={40} />
                  <OrbitControls 
                    enablePan={false} 
                    maxPolarAngle={Math.PI / 2} 
                    minPolarAngle={Math.PI / 6}
                    maxDistance={25}
                    minDistance={5}
                  />

                    <Suspense fallback={<mesh><sphereGeometry args={[0.1]} /><meshStandardMaterial color="#66fcf1" emissive="#66fcf1" /></mesh>}>
                      <ambientLight intensity={0.5} />
                      <Environment preset="city" />
                      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
                      <pointLight position={[-10, 5, 5]} intensity={0.5} />

                      <SegregatorStructure />

                      <group position={[0, -4.5, 2]}>
                        {BINS.map(bin => (
                          <Bin 
                            key={bin.id}
                            position={[bin.targetX, 0, 0]} 
                            color={bin.color} 
                            label={bin.label} 
                            icon={bin.icon}
                          />
                        ))}
                      </group>

                    <group position={[1, 0, 0]}>
                      {CATEGORIES.map((cat, i) => (
                        <ComponentBox 
                          key={`sensor-${cat.id}`}
                          position={[-5 + i * 2.5, 5, -2]} 
                          label={cat.sensor.toUpperCase()}
                          icon={cat.id === 'metal' ? Radio : (cat.id === 'wet' ? Waves : CameraIcon)}
                          onClick={() => startSimulation(cat.id)}
                        />
                      ))}
                      
                      <RaspberryPi position={[3, 1, 0.2]} rotation={[0, -Math.PI/2, 0]} />
                      
                      {CATEGORIES.map((cat, i) => (
                        <Servo 
                          key={`servo-${cat.id}`}
                          position={[-5 + i * 2.5, -3, 0]} 
                          active={activeCategory === cat.id}
                          label={cat.name.toUpperCase()}
                        />
                      ))}

                      {activeCategory && (
                        <WasteItem 
                          categoryId={activeCategory} 
                          onComplete={() => {
                            // Reset simulation state after fall is done
                            // We use a slight delay in the startSimulation logic usually
                          }}
                        />
                      )}
                      
                      {/* Circuit Floor Plane */}
                      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -6, 0]} receiveShadow>
                        <planeGeometry args={[30, 30]} />
                        <meshStandardMaterial color="#0b0c10" roughness={1} metalness={0} opacity={0.5} transparent />
                      </mesh>

                      {CATEGORIES.map((cat) => {
                        const path = cablePaths[cat.id];
                        const isActive = activeCategory === cat.id;
                        return (
                          <group key={`wires-${cat.id}`}>
                            <ThreeLine 
                              points={path.sensorToPi} 
                              color={isActive ? COLORS.highlight : COLORS.data} 
                              lineWidth={isActive ? 3 : 1} 
                              transparent 
                              opacity={isActive ? 0.8 : 0.1} 
                            />
                            <ThreeLine 
                              points={path.piToServo} 
                              color={isActive ? COLORS.highlight : COLORS.pwm} 
                              lineWidth={isActive ? 3 : 1} 
                              transparent 
                              opacity={isActive ? 0.8 : 0.1} 
                            />
                            {isActive && (
                              <>
                                <DataPulse points={path.sensorToPi} color={COLORS.highlight} speed={6} />
                                <DataPulse points={path.piToServo} color={COLORS.highlight} speed={6} />
                              </>
                            )}
                          </group>
                        );
                      })}
                    </group>
                  </Suspense>
                </Canvas>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="schematic" 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="h-full w-full rounded-xl overflow-hidden border border-[#45a29e]/30"
            >
              <TechnicalSchematic />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <footer className="h-auto">
        <LogicMap onSimulate={startSimulation} />
      </footer>
    </div>
  );
}
