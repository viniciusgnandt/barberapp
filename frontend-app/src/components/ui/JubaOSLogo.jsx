import logo from '../../assets/JubaOS_Logo.png';

export default function JubaOSLogo({ size = 20, className = '' }) {
  return (
    <img
      src={logo}
      alt="JubaOS"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain', borderRadius: '22%' }}
    />
  );
}
