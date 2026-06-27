import { Handle, Position } from '@xyflow/react';
import { Folder, FileCode2, Box, FunctionSquare } from 'lucide-react';

// Common node styles
const containerStyle = {
  backgroundColor: 'rgba(30, 30, 30, 0.6)',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: '4px',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  position: 'relative' as const,
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  padding: '4px 8px',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  fontSize: '12px',
  fontWeight: 'bold',
  color: '#d4d4d4',
  borderTopLeftRadius: '3px',
  borderTopRightRadius: '3px',
};

// Node Types
export const FolderNode = ({ data }: any) => {
  return (
    <div style={{ ...containerStyle, borderColor: '#4fc1ff', backgroundColor: 'rgba(79, 193, 255, 0.05)' }}>
      <div style={headerStyle}>
        <Folder className="w-3.5 h-3.5 mr-2 text-[#4fc1ff]" />
        {data.label}
      </div>
    </div>
  );
};

export const FileNode = ({ data }: any) => {
  return (
    <div style={{ ...containerStyle, borderColor: '#dcdcaa', backgroundColor: 'rgba(220, 220, 170, 0.05)' }}>
      <div style={headerStyle}>
        <FileCode2 className="w-3.5 h-3.5 mr-2 text-[#dcdcaa]" />
        {data.label}
      </div>
    </div>
  );
};

export const ClassNode = ({ data }: any) => {
  return (
    <div style={{ ...containerStyle, borderColor: '#4ec9b0', backgroundColor: 'rgba(78, 201, 176, 0.05)' }}>
      <div style={headerStyle}>
        <Box className="w-3.5 h-3.5 mr-2 text-[#4ec9b0]" />
        {data.label}
      </div>
    </div>
  );
};

const TYPE_COLORS: Record<string, string> = {
  'pd.DataFrame': '#4fc1ff',
  'DataFrame': '#4fc1ff',
  'str': '#ce9178',
  'dict': '#dcdcaa',
  'Dict': '#dcdcaa',
  'tuple': '#4ec9b0',
  'int': '#b5cea8',
  'float': '#b5cea8',
};

function typeColor(t: string) {
  return TYPE_COLORS[t] || '#569cd6';
}

export const FunctionNode = ({ data }: any) => {
  const inputTypes: string[] = data.inputTypes || [];
  const outputTypes: string[] = data.outputTypes || [];

  return (
    <div style={{
      ...containerStyle, 
      borderColor: '#ce9178', 
      backgroundColor: '#1e1e1e',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Default handles for edge connections */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ top: '50%', background: '#569cd6', width: '8px', height: '8px', border: '2px solid #1e1e1e' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ top: '50%', background: '#c586c0', width: '8px', height: '8px', border: '2px solid #1e1e1e' }}
      />

      <div style={{ ...headerStyle, borderBottom: 'none' }}>
        <FunctionSquare className="w-3.5 h-3.5 mr-2 text-[#ce9178]" />
        <span className="truncate">{data.label}</span>
      </div>
      
      {/* Typed Input Ports */}
      {inputTypes.map((type: string, i: number) => (
        <Handle
          key={`in-${i}`}
          type="target"
          position={Position.Left}
          id={`in-${i}`}
          style={{
            top: `${30 + (i + 1) * (40 / (inputTypes.length + 1))}%`,
            background: typeColor(type),
            width: '7px',
            height: '7px',
            border: '2px solid #1e1e1e'
          }}
          title={type}
        />
      ))}
      
      {/* Typed Output Ports */}
      {outputTypes.map((type: string, i: number) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Right}
          id={`out-${i}`}
          style={{
            top: `${30 + (i + 1) * (40 / (outputTypes.length + 1))}%`,
            background: typeColor(type),
            width: '7px',
            height: '7px',
            border: '2px solid #1e1e1e'
          }}
          title={type}
        />
      ))}
    </div>
  );
};

export const nodeTypes = {
  folder: FolderNode,
  file: FileNode,
  class: ClassNode,
  function: FunctionNode,
};