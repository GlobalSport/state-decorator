import { makeStyles } from '@material-ui/styles';
import orange from '@material-ui/core/colors/orange';
import green from '@material-ui/core/colors/green';

const useCommonStyles = makeStyles({
  app: {
    fontFamily: 'roboto',
    fontSize: 15,
  },
  button: {
    background: orange[500],
    border: 0,
    borderRadius: 3,
    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
    color: 'white',
    height: 20,
    padding: '0 10px',
    fontSize: 13,
    '&:hover': {
      background: orange[500],
    },
  },
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: '50px',
  },
  card: {
    width: 'calc(100% / 3 - 60px)',
    margin: '0 20px 50px 20px',
  },
  cardHeader: {
    textAlign: 'center',
  },
  textField: {
    margin: '5px 0 10px 0',
  },
  smallCardContainer: {
    textAlign: 'center',
  },
  smallCardValue: {
    marginTop: 20,
  },
});

export default useCommonStyles;
