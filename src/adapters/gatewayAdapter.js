export function createGatewayAdapter() {
  return {
    mode: "simulator",
    status() {
      return {
        active: false,
        wan: null,
        lan: null,
        message: "Real packet forwarding adapter is not enabled in this Node build."
      };
    }
  };
}
