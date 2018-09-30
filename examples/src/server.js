import express from 'express';
import bodyParser from 'body-parser';
import livereload from 'livereload';

const nodeEnv = process.env.NODE_ENV;

const port = process.env.PORT || 3000;
const DIST = `${__dirname}/../dist/`;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const lrserver = livereload.createServer({ exts: ['html', 'js', 'css', 'yml'] });
console.log(`Watching ${DIST}`);

lrserver.watch([DIST]);

app.use('/', express.static(DIST));

app.listen(port, () => {
  console.log(`Server started on port ${port} in ${nodeEnv}!`);
});
