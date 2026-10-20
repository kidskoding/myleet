// Package prompt caches LeetCode statements on the learner's machine only; they
// are copyrighted, so they are never written into the repo.
package prompt

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	htmltomarkdown "github.com/JohannesKaufmann/html-to-markdown/v2"

	"github.com/kidskoding/myleet/internal/catalog"
)

const (
	DefaultEndpoint = "https://leetcode.com/graphql"
	fetchTimeout    = 15 * time.Second
	premiumSuffix   = ".premium"
	query           = `query q($titleSlug: String!) { question(titleSlug: $titleSlug) { isPaidOnly content } }`
)

type Status string

const (
	Authored Status = "authored" // prompt written in problem.toml
	Cached   Status = "cached"
	Fetched  Status = "fetched"
	Premium  Status = "premium"   // LeetCode premium, statement not public
	Offline  Status = "offline"   // fetch failed; try again later
	NoSource Status = "no-source" // not a LeetCode problem, or unknown slug
)

type Result struct {
	Markdown string
	Status   Status
	Err      error
}

type Source struct {
	Dir      string // <data>/prompts
	Endpoint string
	Client   *http.Client
}

var slugRE = regexp.MustCompile(`leetcode\.com/problems/([a-z0-9-]+)`)

func Slug(url string) string {
	if m := slugRE.FindStringSubmatch(url); m != nil {
		return m[1]
	}
	return ""
}

// cacheKey uses the slug so a problem listed in several modules shares one file.
func cacheKey(p *catalog.Problem) string {
	if slug := Slug(p.URL); slug != "" {
		return slug
	}
	return p.ID
}

func (s Source) cachePath(key string) string { return filepath.Join(s.Dir, key+".md") }

func (s Source) Get(ctx context.Context, p *catalog.Problem) Result {
	if strings.TrimSpace(p.Prompt) != "" {
		return Result{Markdown: p.Prompt, Status: Authored}
	}
	key := cacheKey(p)
	if data, err := os.ReadFile(s.cachePath(key)); err == nil && len(strings.TrimSpace(string(data))) > 0 {
		return Result{Markdown: string(data), Status: Cached}
	}
	if _, err := os.Stat(s.cachePath(key) + premiumSuffix); err == nil {
		return Result{Status: Premium}
	}
	slug := Slug(p.URL)
	if slug == "" {
		return Result{Status: NoSource}
	}
	content, paid, found, err := s.fetch(ctx, slug)
	switch {
	case err != nil:
		return Result{Status: Offline, Err: err}
	case !found:
		return Result{Status: NoSource}
	case content == "" && paid:
		_ = s.write(key+".md"+premiumSuffix, "")
		return Result{Status: Premium}
	case content == "":
		return Result{Status: NoSource}
	}
	md, err := ToMarkdown(content)
	if err != nil {
		return Result{Status: Offline, Err: err}
	}
	_ = s.write(key+".md", md)
	return Result{Markdown: md, Status: Fetched}
}

func (s Source) write(name, content string) error {
	if err := os.MkdirAll(s.Dir, 0o755); err != nil {
		return err
	}
	// Write then rename so an interrupted write never leaves a truncated statement.
	tmp, err := os.CreateTemp(s.Dir, ".tmp-*")
	if err != nil {
		return err
	}
	if _, err := tmp.WriteString(content); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return err
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmp.Name())
		return err
	}
	return os.Rename(tmp.Name(), filepath.Join(s.Dir, name))
}

func (s Source) fetch(ctx context.Context, slug string) (content string, paid, found bool, err error) {
	endpoint := s.Endpoint
	if endpoint == "" {
		endpoint = DefaultEndpoint
	}
	client := s.Client
	if client == nil {
		client = &http.Client{Timeout: fetchTimeout}
	}
	body, _ := json.Marshal(map[string]any{"query": query, "variables": map[string]string{"titleSlug": slug}})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return "", false, false, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Referer", "https://leetcode.com/problems/"+slug+"/")
	req.Header.Set("User-Agent", "myleet (personal study tool)")
	resp, err := client.Do(req)
	if err != nil {
		return "", false, false, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", false, false, fmt.Errorf("leetcode returned %s", resp.Status)
	}
	var out struct {
		Errors []struct {
			Message string `json:"message"`
		} `json:"errors"`
		Data struct {
			Question *struct {
				IsPaidOnly bool    `json:"isPaidOnly"`
				Content    *string `json:"content"`
			} `json:"question"`
		} `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", false, false, err
	}
	if len(out.Errors) > 0 {
		return "", false, false, fmt.Errorf("leetcode: %s", out.Errors[0].Message)
	}
	q := out.Data.Question
	if q == nil {
		return "", false, false, nil
	}
	if q.Content == nil {
		return "", q.IsPaidOnly, true, nil
	}
	return *q.Content, q.IsPaidOnly, true, nil
}

var (
	supRE    = regexp.MustCompile(`(?s)<sup>(.*?)</sup>`)
	blankRun = regexp.MustCompile(`\n{3,}`)
)

// Superscripts become ^n so 10<sup>4</sup> reads as 10^4 in a terminal.
func ToMarkdown(html string) (string, error) {
	html = supRE.ReplaceAllString(html, "^$1")
	html = strings.ReplaceAll(html, "&nbsp;", " ")
	md, err := htmltomarkdown.ConvertString(html)
	if err != nil {
		return "", err
	}
	md = blankRun.ReplaceAllString(strings.TrimSpace(md), "\n\n")
	if md == "" {
		return "", errors.New("empty statement")
	}
	return md + "\n", nil
}
