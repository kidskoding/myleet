package prompt

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/kidskoding/myleet/internal/catalog"
)

const kokoHTML = `<p>Koko loves to eat bananas. There are <code>n</code> piles.</p>
<p><strong class="example">Example 1:</strong></p>
<pre><strong>Input:</strong> piles = [3,6,7,11], h = 8
<strong>Output:</strong> 4
</pre>
<ul><li><code>1 &lt;= piles.length &lt;= 10<sup>4</sup></code></li></ul>`

func server(t *testing.T, calls *int32) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		atomic.AddInt32(calls, 1)
		body, _ := io.ReadAll(r.Body)
		var req struct {
			Variables struct {
				Slug string `json:"titleSlug"`
			} `json:"variables"`
		}
		json.Unmarshal(body, &req)
		switch req.Variables.Slug {
		case "koko-eating-bananas":
			json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"question": map[string]any{"isPaidOnly": false, "content": kokoHTML}}})
		case "meeting-rooms-ii":
			json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"question": map[string]any{"isPaidOnly": true, "content": nil}}})
		default:
			json.NewEncoder(w).Encode(map[string]any{"data": map[string]any{"question": nil}})
		}
	}))
	t.Cleanup(srv.Close)
	return srv
}

func problem(id, url, prompt string) *catalog.Problem {
	return &catalog.Problem{ID: id, URL: url, Prompt: prompt}
}

func TestFetchConvertsAndCaches(t *testing.T) {
	var calls int32
	src := Source{Dir: t.TempDir(), Endpoint: server(t, &calls).URL}
	p := problem("koko-eating-bananas", "https://leetcode.com/problems/koko-eating-bananas/", "")
	res := src.Get(context.Background(), p)
	if res.Status != Fetched {
		t.Fatalf("status = %s (%v)", res.Status, res.Err)
	}
	for _, want := range []string{"Koko loves to eat bananas", "`n`", "Example 1", "piles = [3,6,7,11]", "10^4"} {
		if !strings.Contains(res.Markdown, want) {
			t.Errorf("markdown missing %q:\n%s", want, res.Markdown)
		}
	}
	again := src.Get(context.Background(), p)
	if again.Status != Cached || again.Markdown != res.Markdown || atomic.LoadInt32(&calls) != 1 {
		t.Fatalf("second get: status=%s calls=%d", again.Status, calls)
	}
	if _, err := os.Stat(filepath.Join(src.Dir, "koko-eating-bananas.md")); err != nil {
		t.Fatal("cache file missing")
	}
}

func TestPremiumIsRememberedWithoutRefetch(t *testing.T) {
	var calls int32
	src := Source{Dir: t.TempDir(), Endpoint: server(t, &calls).URL}
	p := problem("meeting-rooms-ii", "https://leetcode.com/problems/meeting-rooms-ii/", "")
	if res := src.Get(context.Background(), p); res.Status != Premium {
		t.Fatalf("status = %s", res.Status)
	}
	if res := src.Get(context.Background(), p); res.Status != Premium || atomic.LoadInt32(&calls) != 1 {
		t.Fatalf("premium refetched: calls=%d", calls)
	}
}

func TestOwnPromptWins(t *testing.T) {
	var calls int32
	src := Source{Dir: t.TempDir(), Endpoint: server(t, &calls).URL}
	res := src.Get(context.Background(), problem("koko-eating-bananas", "https://leetcode.com/problems/koko-eating-bananas/", "Our own words."))
	if res.Status != Authored || res.Markdown != "Our own words." || calls != 0 {
		t.Fatalf("res = %+v calls=%d", res, calls)
	}
}

func TestOfflineIsNotCached(t *testing.T) {
	srv := httptest.NewServer(http.NotFoundHandler())
	srv.Close()
	src := Source{Dir: t.TempDir(), Endpoint: srv.URL}
	p := problem("koko-eating-bananas", "https://leetcode.com/problems/koko-eating-bananas/", "")
	if res := src.Get(context.Background(), p); res.Status != Offline || res.Err == nil {
		t.Fatalf("res = %+v", res)
	}
	if entries, _ := os.ReadDir(src.Dir); len(entries) != 0 {
		t.Fatalf("offline result must not be cached: %v", entries)
	}
}

func TestNotOnLeetCode(t *testing.T) {
	src := Source{Dir: t.TempDir(), Endpoint: "http://unused.invalid"}
	if res := src.Get(context.Background(), problem("closest-pair-of-points", "", "")); res.Status != NoSource {
		t.Fatalf("status = %s", res.Status)
	}
}

func TestUnknownSlug(t *testing.T) {
	var calls int32
	src := Source{Dir: t.TempDir(), Endpoint: server(t, &calls).URL}
	if res := src.Get(context.Background(), problem("x", "https://leetcode.com/problems/does-not-exist/", "")); res.Status != NoSource {
		t.Fatalf("status = %s", res.Status)
	}
}

func TestEmptyCacheFileIsRefetched(t *testing.T) {
	var calls int32
	src := Source{Dir: t.TempDir(), Endpoint: server(t, &calls).URL}
	os.WriteFile(filepath.Join(src.Dir, "koko-eating-bananas.md"), nil, 0o644)
	p := problem("koko-eating-bananas", "https://leetcode.com/problems/koko-eating-bananas/", "")
	if res := src.Get(context.Background(), p); res.Status != Fetched {
		t.Fatalf("an empty cache file must be treated as missing: %s", res.Status)
	}
}

func TestGraphQLErrorIsOffline(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(`{"errors":[{"message":"rate limited"}],"data":{"question":null}}`))
	}))
	defer srv.Close()
	src := Source{Dir: t.TempDir(), Endpoint: srv.URL}
	res := src.Get(context.Background(), problem("koko-eating-bananas", "https://leetcode.com/problems/koko-eating-bananas/", ""))
	if res.Status != Offline || res.Err == nil || !strings.Contains(res.Err.Error(), "rate limited") {
		t.Fatalf("res = %+v", res)
	}
}

func TestCacheSharedAcrossDuplicateIDs(t *testing.T) {
	var calls int32
	src := Source{Dir: t.TempDir(), Endpoint: server(t, &calls).URL}
	url := "https://leetcode.com/problems/koko-eating-bananas/"
	src.Get(context.Background(), problem("koko-eating-bananas", url, ""))
	res := src.Get(context.Background(), problem("koko-eating-bananas-binary_search", url, ""))
	if res.Status != Cached || atomic.LoadInt32(&calls) != 1 {
		t.Fatalf("the same LeetCode problem in another module must reuse the cache: %s calls=%d", res.Status, calls)
	}
}
