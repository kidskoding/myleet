from solution import Twitter


def test_twitter_feed_most_recent_first():
    twitter = Twitter()
    twitter.post_tweet(1, 5)
    assert twitter.get_news_feed(1) == [5]
    twitter.follow(1, 2)
    twitter.post_tweet(2, 6)
    assert twitter.get_news_feed(1) == [6, 5]
    twitter.unfollow(1, 2)
    assert twitter.get_news_feed(1) == [5]


def test_twitter_feed_caps_at_ten():
    twitter = Twitter()
    for tweet_id in range(15):
        twitter.post_tweet(1, tweet_id)
    feed = twitter.get_news_feed(1)
    assert len(feed) == 10
    assert feed[0] == 14


def test_twitter_feed_empty_when_no_posts():
    twitter = Twitter()
    assert twitter.get_news_feed(1) == []
