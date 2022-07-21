# dbt Cloud action

This action lets you trigger a job run on [dbt Cloud](https://cloud.getdbt.com), fetches the `run_results.json` artifact, and `git checkout`s the branch that was ran by dbt Cloud.

## Inputs

### Required
- `dbt_cloud_token` - dbt Cloud [API token](https://docs.getdbt.com/docs/dbt-cloud/dbt-cloud-api/service-tokens)
- `dbt_cloud_account_id` - dbt Cloud Account ID
- `dbt_cloud_job_id` - dbt Cloud Job ID


### Optional
- `cause` - Cause message to use [Default=`"Triggered by a GitHub Action"`]
- `interval` - The interval between polls in seconds [Default=`30`]

We recommend passing sensitive variables as GitHub secrets. [Example usage](https://github.com/fal-ai/fal_bike_example/blob/main/.github/workflows/fal_dbt.yml).

## Create your workflow
```yaml
name: Run dbt cloud
on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: fal-ai/dbt-cloud-action@main
        id: dbt_cloud_run
        with:
          dbt_cloud_token: ${{ secrets.DBT_CLOUD_API_TOKEN }}
          dbt_cloud_account_id: ${{ secrets.DBT_CLOUD_ACCOUNT_ID }}
          dbt_cloud_job_id: ${{ secrets.DBT_CLOUD_JOB_ID }}
```

### Use with [fal](https://github.com/fal-ai/fal)

You can trigger a dbt Cloud run and it will download the artifacts to be able to run your `fal run` command easily in GitHub Actions.

You have to do certain extra steps described here:

```yaml
name: Run dbt cloud and fal scripts
on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      # Checkout before downloading artifacts or setting profiles.yml
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: fal-ai/dbt-cloud-action@main
        id: dbt_cloud_run
        with:
          dbt_cloud_token: ${{ secrets.DBT_CLOUD_API_TOKEN }}
          dbt_cloud_account_id: ${{ secrets.DBT_ACCOUNT_ID }}
          dbt_cloud_job_id: ${{ secrets.DBT_CLOUD_JOB_ID }}

      - name: Setup profiles.yml
        shell: python
        env:
          contents: ${{ secrets.PROFILES_YML }}
        run: |
          import yaml
          import os
          import io

          profiles_string = os.getenv('contents')
          profiles_data = yaml.safe_load(profiles_string)

          with io.open('profiles.yml', 'w', encoding='utf8') as outfile:
            yaml.dump(profiles_data, outfile, default_flow_style=False, allow_unicode=True)

      - uses: actions/setup-python@v2
        with:
          python-version: "3.9.x"

      - name: Install dependencies
        # Normally would install a `requirements.txt`.
        # This is to make it visible.
        run: |
          pip install dbt-bigquery
          pip install fal

      - name: Run fal scripts
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_BOT_CHANNEL: ${{ secrets.SLACK_BOT_CHANNEL }}
        run: |
          # Move to the same code state of the dbt Cloud Job
          git checkout ${{ steps.dbt_cloud_run.outputs.git_sha }}
          # TODO: review target in passed profiles.yaml contents
          fal run --profiles-dir .

```
