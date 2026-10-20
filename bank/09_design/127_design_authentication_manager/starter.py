class AuthenticationManager:
    # Problem 127: Design Authentication Manager
    # Time:
    # Space:

    def __init__(self, time_to_live: int) -> None:
        raise NotImplementedError

    def generate(self, token_id: str, current_time: int) -> None:
        raise NotImplementedError

    def renew(self, token_id: str, current_time: int) -> None:
        raise NotImplementedError

    def count_unexpired_tokens(self, current_time: int) -> int:
        raise NotImplementedError
