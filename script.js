const EventEmitter = require('events');
const fs = require('fs');

const Mailjet = require('node-mailjet')
const mailjet = new Mailjet({
  apiKey: "4ca14c170f7ca87f0c03b84db91545ea",
  apiSecret: "be3ebbb526be2508758ba86c8f6530e7"
});

class TemperatureSensor extends EventEmitter {
  constructor() {
    super();
    this.temperatures = {};
    this.temperaturesFilePath = 'temperatures.json';
    this.loadTemperatures();
  }

  addTemperature(date, temperatures) {
    this.temperatures[date] = temperatures;
    this.saveTemperatures();
    const averageTemperature = temperatures.reduce((acc, val) => acc + val, 0) / temperatures.length;
    if (averageTemperature > 30) {
      this.emit('highTemperature', {date, temperature: averageTemperature});
    }
  }

  getAverageTemperature(date) {
    const temperaturesForDate = this.temperatures[date];
    if (!temperaturesForDate || temperaturesForDate.length === 0) {
      console.log(`Для дати ${date} немає даних про температуру повітря`);
      return;
    }
    const totalTemperature = temperaturesForDate.reduce((acc, val) => acc + val, 0);
    const averageTemperature = totalTemperature / temperaturesForDate.length;
    console.log(`Середня температура повітря для дати ${date}: ${averageTemperature} градуси`);
 
    const request = mailjet
        .post("send", {'version': 'v3.1'})
        .request({
            "Messages":[{
                "From": {
                    "Email": "temperaturesinyoudasd@gmail.com",
                    "Name": "Temperature Tracker"
                },
                "To": [{
                    "Email": "YOU-EMAIL@gmail.com",
                    "Name": "Temperature Tracker"
                }],
                "Subject": `Середня температура повітря для дати ${date}`,
                "TextPart": `Середня температура повітря для дати ${date}: ${averageTemperature}`,
                "HTMLPart": `<h3>Середня температура повітря для дати ${date}: ${averageTemperature} °C</h3>`
            }]
        })
    request
        .then((result) => {
            console.log(result.body.Messages[0].Status)
        })
        .catch((err) => {
            console.log(err.statusCode)
        })
  }
  
  saveTemperatures() {
    try {
      fs.writeFileSync(this.temperaturesFilePath, JSON.stringify(this.temperatures), 'utf8');
    } catch (err) {
      console.error(err);
    }
  }
  

  loadTemperatures() {
    fs.readFile(this.temperaturesFilePath, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') { // якщо файл не знайдено
          console.log(`Файл ${this.temperaturesFilePath} не знайдено. Створюємо новий файл...`);
          this.saveTemperatures(); // створюємо новий файл
          setTimeout(() => {
            this.emit('temperaturesLoaded');
          }, 1000);
          return;
        }
        console.error(err);
        return;
      }
      try {
        const loadedTemperatures = JSON.parse(data);
        this.temperatures = Object.assign({}, this.temperatures, loadedTemperatures);
        this.emit('temperaturesLoaded');
      } catch (e) {
        console.error(e);
      }
    });
  }
}

const sensor = new TemperatureSensor();

sensor.on('highTemperature', ({date, temperature}) => {
  console.log(`Увага! Середня температура повітря вища за 30 градусів (${temperature} градусів) на дату ${date}`);
});

sensor.on('temperaturesLoaded', () => {
  sensor.addTemperature("2023-04-20", [25, 45]);
  sensor.addTemperature("2023-04-21", [30, 20, 25, 15, 25]);
  sensor.addTemperature("2023-04-22", [20]);

  sensor.getAverageTemperature("2023-04-20");
  sensor.getAverageTemperature("2023-04-21");
  sensor.getAverageTemperature("2023-04-22");

  console.log(sensor.temperatures);
});
