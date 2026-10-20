class AuthenticationManager:
    def __init__(self, time_to_live: int) -> None:
        self.ttl = time_to_live
        self.expiry: dict[str, int] = {}

    def generate(self, token_id: str, current_time: int) -> None:
        self.expiry[token_id] = current_time + self.ttl

    def renew(self, token_id: str, current_time: int) -> None:
        if self.expiry.get(token_id, 0) > current_time:
            self.expiry[token_id] = current_time + self.ttl

    def count_unexpired_tokens(self, current_time: int) -> int:
        return sum(1 for t in self.expiry.values() if t > current_time)
