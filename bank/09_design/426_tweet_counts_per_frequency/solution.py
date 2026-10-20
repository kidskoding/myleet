from collections import defaultdict


class TweetCounts:
    SIZES = {"minute": 60, "hour": 3600, "day": 86400}

    def __init__(self) -> None:
        # Time: O(1).
        # Space: O(total tweets).
        self.times: defaultdict[str, list[int]] = defaultdict(list)

    def record_tweet(self, tweet_name: str, time: int) -> None:
        # Time: O(1).
        # Space: O(1).
        self.times[tweet_name].append(time)

    def get_tweet_counts_per_frequency(self, freq: str, tweet_name: str, start_time: int, end_time: int) -> list[int]:
        # Time: O(k + buckets) for k recorded times of that name.
        # Space: O(buckets).
        size = self.SIZES[freq]
        buckets = [0] * ((end_time - start_time) // size + 1)
        for t in self.times.get(tweet_name, []):
            if start_time <= t <= end_time:
                buckets[(t - start_time) // size] += 1
        return buckets
