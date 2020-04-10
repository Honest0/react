// Example

const x = React.createElement;

class ErrorBoundary extends React.Component {
  static getDerivedStateFromError(error) {
    return {
      error: error,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.log(error.message, errorInfo.componentStack);
    this.setState({
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state && this.state.error) {
      return x(
        'div',
        null,
        x('h3', null, this.state.error.message),
        x('pre', null, this.state.componentStack)
      );
    }
    return this.props.children;
  }
}

function Example() {
  let state = React.useState(false);
  return x(
    ErrorBoundary,
    null,
    x(
      DisplayName,
      null,
      x(
        React.SuspenseList,
        null,
        x(
          NativeClass,
          null,
          x(
            BabelClass,
            null,
            x(
              React.Suspense,
              null,
              x('div', null, x(Component, null, x(Throw)))
            )
          )
        )
      )
    )
  );
}
