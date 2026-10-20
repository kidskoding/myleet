class BrowserHistory:
    # Problem 23: Design Browser History
    # Time:
    # Space:

    def __init__(self, homepage: str) -> None:
        raise NotImplementedError

    def visit(self, url: str) -> None:
        raise NotImplementedError

    def back(self, steps: int) -> str:
        raise NotImplementedError

    def forward(self, steps: int) -> str:
        raise NotImplementedError
