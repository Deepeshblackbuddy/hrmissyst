import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

Highcharts.setOptions({
  chart: { backgroundColor: 'transparent', style: { fontFamily: 'Sora, sans-serif' } },
  credits: { enabled: false },
  title: { text: undefined },
  lang: { thousandsSep: ',' },
  tooltip: { backgroundColor: '#0d1117', borderColor: '#2a313c', style: { color: '#e8ecf1' }, borderRadius: 10 },
});

export default function Chart({ options }) {
  return <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { width: '100%' } }} />;
}
